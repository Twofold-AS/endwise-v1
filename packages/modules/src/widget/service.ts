import { and, type Database, eq, isNull, schema, sql, withTenant } from '@endwise/db';
import { createBooking } from '../booking/engine.ts';
import {
  computeFreeSlots,
  isOfferedSlot,
  WIDGET_SLOT_STEP_MINUTES,
  widgetWorkingDay,
} from './availability.ts';
import { generatePublishableKey } from './keys.ts';
import { normalizeOrigin } from './origin.ts';

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
        const [ver] = await tx
          .select({ durationMinutes: schema.serviceVersions.durationMinutes })
          .from(schema.serviceVersions)
          .where(eq(schema.serviceVersions.id, input.serviceVersionId))
          .limit(1);
        if (!ver) return [];

        // Kapasitet = antall aktive mekanikere (samtidige jobber). Aggregat, ikke liste.
        const [cap] = await tx
          .select({ n: sql<number>`coalesce(sum(${schema.mechanics.capacity}), 0)::int` })
          .from(schema.mechanics)
          .where(eq(schema.mechanics.active, true));
        const capacity = cap?.n ?? 0;
        if (capacity === 0) return [];

        // Opptatt-intervaller i vinduet — KUN tider, ingen kunde/booking-ID.
        const busy = await tx
          .select({ start: schema.bookings.startsAt, end: schema.bookings.endsAt })
          .from(schema.bookings)
          .where(
            and(
              sql`${schema.bookings.status} in ('confirmed','in_progress','draft')`,
              sql`${schema.bookings.startsAt} < ${input.dayEnd}`,
              sql`${schema.bookings.endsAt} > ${input.dayStart}`,
            ),
          );

        return computeFreeSlots({
          dayStart: input.dayStart,
          dayEnd: input.dayEnd,
          durationMinutes: ver.durationMinutes,
          stepMinutes: input.stepMinutes ?? 30,
          capacity,
          busy: busy.map((b) => ({ start: b.start, end: b.end })),
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
      // F4-20 — klienten kan sende tjeneste B + et slot regnet ut for A.
      // Avvis før vi lager kunde: start må finnes i tilgjengeligheten for VERSJONEN.
      const { dayStart, dayEnd } = widgetWorkingDay(input.startsAt);
      const offered = await createWidgetPublicService(db).availableSlots(tenantId, {
        serviceVersionId: input.serviceVersionId,
        dayStart,
        dayEnd,
        stepMinutes: WIDGET_SLOT_STEP_MINUTES,
        notBefore: new Date(),
      });
      if (!isOfferedSlot(input.startsAt, offered)) {
        throw new WidgetBookingError('Valgt tid er ikke ledig for denne tjenesten');
      }

      // 1) Prep i RLS-transaksjon: varighet, mekanikervalg, opprett kunde (deres egne data).
      const prep = await withTenant(db, tenantId, async (tx) => {
        const [ver] = await tx
          .select({ durationMinutes: schema.serviceVersions.durationMinutes })
          .from(schema.serviceVersions)
          .where(eq(schema.serviceVersions.id, input.serviceVersionId))
          .limit(1);
        if (!ver) return null;

        const [mech] = await tx
          .select({ id: schema.mechanics.id })
          .from(schema.mechanics)
          .where(eq(schema.mechanics.active, true))
          .limit(1);
        if (!mech) return null;

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

        return { durationMinutes: ver.durationMinutes, mechanicId: mech.id, customerId: cust.id };
      });
      if (!prep) throw new WidgetBookingError('Fant ikke tjeneste eller ledig mekaniker');

      const endsAt = new Date(input.startsAt.getTime() + prep.durationMinutes * 60_000);
      const noteParts = [input.regNumber ? `Regnr: ${input.regNumber}` : null, input.notes].filter(
        Boolean,
      );

      // 2) Booking via slot-lock-motoren (egen transaksjon m/ advisory-lås + idempotens).
      const booking = await createBooking(db, {
        tenantId,
        mechanicId: prep.mechanicId,
        serviceVersionId: input.serviceVersionId,
        startsAt: input.startsAt,
        endsAt,
        customerId: prep.customerId,
        source: 'widget',
        notes: noteParts.length > 0 ? noteParts.join(' · ') : undefined,
        idempotencyKey: input.idempotencyKey,
      });
      return { bookingId: booking.id, status: booking.status };
    },
  };
}

export class WidgetBookingError extends Error {}

export type WidgetPublicService = ReturnType<typeof createWidgetPublicService>;
