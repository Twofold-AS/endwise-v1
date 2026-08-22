import { and, type Database, eq, isNull, schema, sql, withTenant } from '@endwise/db';
import {
  lockMechanic,
  lockShopSlots,
  SlotConflictError,
  type TenantTx,
  writeBooking,
} from '../booking/engine.ts';
import {
  type AssignedBusyInterval,
  computeFreeSlots,
  isOfferedSlot,
  pickMechanicWithRoom,
  WIDGET_SLOT_STEP_MINUTES,
  widgetWorkingDay,
} from './availability.ts';
import { generatePublishableKey } from './keys.ts';
import { normalizeOrigin } from './origin.ts';

/** Samme levende statuser som `/widget/availability` — completed frigir slotet. */
const WIDGET_OCCUPYING = sql`${schema.bookings.status} in ('confirmed','in_progress','draft')`;

/** Ikke-hemmelig view av en widget-nøkkel (trygt til admin-UI). */
export interface WidgetKeyView {
  id: string;
  publishableKey: string;
  allowedOrigins: string[];
  label: string | null;
  active: boolean;
}

/** Resultat av å slå opp en nøkkel (før tenant-kontekst finnes). */
export interface WidgetKeyResolution {
  tenantId: string;
  allowedOrigins: string[];
  active: boolean;
}

/** Public-safe tjeneste (kun det en anonym kunde skal se — ALDRI interne skills). */
export interface WidgetService {
  serviceVersionId: string;
  name: string;
  vehicleType: string;
  durationMinutes: number;
  priceMinor: number | null;
}

/**
 * F4-02 — Forvaltning av widget-nøkler (dealer_admin). Skriv/les er RLS-scopet
 * via `withTenant`. `resolveByPublishableKey` er det ENESTE unscopede oppslaget —
 * den kjører før vi har tenant-kontekst, og nøkkelen er offentlig (raden bærer
 * ingen hemmelighet), så det er trygt. Kall den med en betrodd server-tilkobling.
 */
export function createWidgetKeyService(db: Database) {
  return {
    async issue(
      tenantId: string,
      input: { origins: string[]; label?: string },
    ): Promise<WidgetKeyView> {
      // Normaliser + dedupliser origins; dropp ugyldige.
      const origins = [
        ...new Set(input.origins.map((o) => normalizeOrigin(o)).filter((o): o is string => !!o)),
      ];
      const publishableKey = generatePublishableKey();
      return withTenant(db, tenantId, async (tx) => {
        const [row] = await tx
          .insert(schema.widgetKeys)
          .values({ tenantId, publishableKey, allowedOrigins: origins, label: input.label ?? null })
          .returning();
        return {
          id: row.id,
          publishableKey: row.publishableKey,
          allowedOrigins: row.allowedOrigins,
          label: row.label,
          active: row.active,
        };
      });
    },

    async list(tenantId: string): Promise<WidgetKeyView[]> {
      return withTenant(db, tenantId, async (tx) => {
        const rows = await tx.select().from(schema.widgetKeys);
        return rows.map((r) => ({
          id: r.id,
          publishableKey: r.publishableKey,
          allowedOrigins: r.allowedOrigins,
          label: r.label,
          active: r.active,
        }));
      });
    },

    /**
     * Slå opp tenant + tillatte origins fra en publishable key. UNSCOPED med
     * vilje (vi kjenner ikke tenant ennå). Returnerer null hvis ukjent/inaktiv.
     */
    async resolveByPublishableKey(publishableKey: string): Promise<WidgetKeyResolution | null> {
      if (!publishableKey?.startsWith('pk_')) return null;
      const [row] = await db
        .select({
          tenantId: schema.widgetKeys.tenantId,
          allowedOrigins: schema.widgetKeys.allowedOrigins,
          active: schema.widgetKeys.active,
        })
        .from(schema.widgetKeys)
        .where(eq(schema.widgetKeys.publishableKey, publishableKey))
        .limit(1);
      if (!row?.active) return null;
      return { tenantId: row.tenantId, allowedOrigins: row.allowedOrigins, active: row.active };
    },
  };
}

export type WidgetKeyService = ReturnType<typeof createWidgetKeyService>;

/**
 * F4 — Public-safe datatilgang for anonyme widget-kunder. ALT er RLS-scopet til
 * `tenantId` (fra den validerte nøkkelen). En anonym kunde kan KUN: se tjenester,
 * se ledige tider, opprette EN booking-forespørsel for SIN egen henvendelse.
 * Ingen lister over andres kunder/kjøretøy/bookinger forlater serveren.
 */
/**
 * Shop-snapshot inne i en allerede åpen tenant-tx (CWE-367: ikke et eget kall
 * utenfor låsen). Kapasitet = sum(mechanics.capacity), ikke én rad.
 */
async function shopSlotSnapshot(
  tx: TenantTx,
  input: { serviceVersionId: string; dayStart: Date; dayEnd: Date },
): Promise<{
  durationMinutes: number;
  capacity: number;
  busy: AssignedBusyInterval[];
  mechanics: { id: string; capacity: number }[];
} | null> {
  const [ver] = await tx
    .select({ durationMinutes: schema.serviceVersions.durationMinutes })
    .from(schema.serviceVersions)
    .where(eq(schema.serviceVersions.id, input.serviceVersionId))
    .limit(1);
  if (!ver) return null;

  const mechanics = await tx
    .select({ id: schema.mechanics.id, capacity: schema.mechanics.capacity })
    .from(schema.mechanics)
    .where(eq(schema.mechanics.active, true));
  const capacity = mechanics.reduce((n, m) => n + m.capacity, 0);

  const busy = await tx
    .select({
      start: schema.bookings.startsAt,
      end: schema.bookings.endsAt,
      mechanicId: schema.bookings.mechanicId,
    })
    .from(schema.bookings)
    .where(
      and(
        WIDGET_OCCUPYING,
        sql`${schema.bookings.startsAt} < ${input.dayEnd.toISOString()}`,
        sql`${schema.bookings.endsAt} > ${input.dayStart.toISOString()}`,
      ),
    );

  return {
    durationMinutes: ver.durationMinutes,
    capacity,
    busy,
    mechanics,
  };
}

export function createWidgetPublicService(db: Database) {
  return {
    /** Aktive tjenester med gjeldende versjon. Kun public-safe felt (ikke skills). */
    async listServices(tenantId: string): Promise<WidgetService[]> {
      return withTenant(db, tenantId, async (tx) => {
        const rows = await tx
          .select({
            serviceVersionId: schema.serviceVersions.id,
            name: schema.services.name,
            vehicleType: schema.services.vehicleType,
            durationMinutes: schema.serviceVersions.durationMinutes,
            priceMinor: schema.serviceVersions.priceMinor,
          })
          .from(schema.serviceVersions)
          .innerJoin(schema.services, eq(schema.serviceVersions.serviceId, schema.services.id))
          .where(and(eq(schema.services.active, true), isNull(schema.serviceVersions.validTo)));
        return rows.map((r) => ({ ...r, vehicleType: String(r.vehicleType) }));
      });
    },

    /**
     * Ledige starttider for en tjeneste på en dag. Returnerer KUN tidspunkter —
     * opptatt-tidene (start/slutt fra bookinger) forlater aldri serveren, og
     * ingen kunde-/booking-identitet eksponeres.
     */
    async availableSlots(
      tenantId: string,
      input: {
        serviceVersionId: string;
        dayStart: Date;
        dayEnd: Date;
        stepMinutes?: number;
        notBefore?: Date;
      },
    ): Promise<Date[]> {
      return withTenant(db, tenantId, async (tx) => {
        const snap = await shopSlotSnapshot(tx, input);
        if (!snap || snap.capacity <= 0) return [];
        return computeFreeSlots({
          dayStart: input.dayStart,
          dayEnd: input.dayEnd,
          durationMinutes: snap.durationMinutes,
          stepMinutes: input.stepMinutes ?? WIDGET_SLOT_STEP_MINUTES,
          capacity: snap.capacity,
          busy: snap.busy,
          notBefore: input.notBefore,
        });
      });
    },

    /**
     * Opprett en booking-forespørsel fra widgeten. Mekaniker velges SERVER-side
     * (ingen enumerering av mekanikere fra klienten). Kunden oppgir kun sine egne
     * data. `idempotencyKey` (påkrevd) gjør gjentatt innsending trygg.
     * Går via slot-lock-motoren (F3) — samme overlapp-vern som admin-booking.
     */
    async createBookingRequest(
      tenantId: string,
      input: {
        serviceVersionId: string;
        startsAt: Date;
        customer: { name: string; phone: string; email?: string | null };
        regNumber?: string | null;
        notes?: string | null;
        idempotencyKey: string;
      },
    ): Promise<{ bookingId: string; status: string }> {
      /**
       * CWE-367 — ÉN tenant-tx: shop-lås → tilgjengelighet (aggregat) →
       * mekaniker med rom → skriv. Ikke les utenfor withTenant og skriv etterpå.
       */
      return withTenant(db, tenantId, async (tx) => {
        await tx.execute(lockShopSlots(tenantId));

        if (input.idempotencyKey) {
          const [existing] = await tx
            .select({ id: schema.bookings.id, status: schema.bookings.status })
            .from(schema.bookings)
            .where(eq(schema.bookings.idempotencyKey, input.idempotencyKey))
            .limit(1);
          if (existing) return { bookingId: existing.id, status: existing.status };
        }

        const { dayStart, dayEnd } = widgetWorkingDay(input.startsAt);
        const snap = await shopSlotSnapshot(tx, {
          serviceVersionId: input.serviceVersionId,
          dayStart,
          dayEnd,
        });
        if (!snap) throw new WidgetBookingError('Fant ikke tjeneste eller ledig mekaniker');

        const offered = computeFreeSlots({
          dayStart,
          dayEnd,
          durationMinutes: snap.durationMinutes,
          stepMinutes: WIDGET_SLOT_STEP_MINUTES,
          capacity: snap.capacity,
          busy: snap.busy,
          notBefore: new Date(),
        });
        if (!isOfferedSlot(input.startsAt, offered)) {
          throw new WidgetBookingError('Valgt tid er ikke ledig for denne tjenesten');
        }

        const endsAt = new Date(input.startsAt.getTime() + snap.durationMinutes * 60_000);
        const mechanicId = pickMechanicWithRoom(snap.mechanics, snap.busy, input.startsAt, endsAt);
        if (!mechanicId) throw new WidgetBookingError('Fant ikke tjeneste eller ledig mekaniker');

        await tx.execute(lockMechanic(tenantId, mechanicId));

        const [cust] = await tx
          .insert(schema.customers)
          .values({
            tenantId,
            name: input.customer.name,
            phone: input.customer.phone,
            email: input.customer.email ?? null,
            source: 'widget',
          })
          .returning({ id: schema.customers.id });

        const noteParts = [
          input.regNumber ? `Regnr: ${input.regNumber}` : null,
          input.notes,
        ].filter(Boolean);

        try {
          const booking = await writeBooking(tx, {
            tenantId,
            mechanicId,
            serviceVersionId: input.serviceVersionId,
            startsAt: input.startsAt,
            endsAt,
            customerId: cust.id,
            source: 'widget',
            notes: noteParts.length > 0 ? noteParts.join(' · ') : undefined,
            idempotencyKey: input.idempotencyKey,
          });
          return { bookingId: booking.id, status: booking.status };
        } catch (error) {
          if (error instanceof SlotConflictError) {
            throw new WidgetBookingError('Valgt tid er ikke ledig for denne tjenesten');
          }
          throw error;
        }
      });
    },
  };
}

export class WidgetBookingError extends Error {}

export type WidgetPublicService = ReturnType<typeof createWidgetPublicService>;
