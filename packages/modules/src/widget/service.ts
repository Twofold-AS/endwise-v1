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

/** Etikett på nøkkelen som eies av Butikk-testplasseringen — ikke Framer. */
export const BUTIKK_TEST_WIDGET_LABEL = 'Butikk-testplassering';

/** In-app embed på https://endwise.no/butikk må alltid få lov (CWE-346). */
export const ENDWISE_APP_ORIGIN = 'https://endwise.no';

const BUTIKK_TEST_ORIGIN_TAK = 20;

function toKeyView(row: {
  id: string;
  publishableKey: string;
  allowedOrigins: string[];
  label: string | null;
  active: boolean;
}): WidgetKeyView {
  return {
    id: row.id,
    publishableKey: row.publishableKey,
    allowedOrigins: row.allowedOrigins,
    label: row.label,
    active: row.active,
  };
}

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

/** Public-safe tjeneste (kun det en anonym kunde skal se — aldri interne skills). */
export interface WidgetService {
  serviceVersionId: string;
  name: string;
  vehicleType: string;
  durationMinutes: number;
  priceMinor: number | null;
}

/**
 * Forvaltning av widget-nøkler (dealer_admin). Skriv/les er RLS-scopet
 * via `withTenant`. `resolveByPublishableKey` er det eneste unscopede oppslaget
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
        return toKeyView(row);
      });
    },

    /**
     * Get-or-create for midlertidig testplassering på /butikk.
     * Rører bare nøkkelen merket `BUTIKK_TEST_WIDGET_LABEL` — Framer-nøkler
     * med annen etikett står urørt. Origin-listen er allowlisten /widget/init
     * sjekker (CWE-346); preview-URLer byttes, så vi appender og cap'er.
     * `https://endwise.no` er alltid med — innlogget forhandler tester
     * egen widget på /butikk.
     */
    async ensureShopTestKey(tenantId: string, origin: string): Promise<WidgetKeyView> {
      const norm = normalizeOrigin(origin);
      if (!norm) throw new WidgetKeyOriginError('Ugyldig origin');
      const seed = [...new Set([ENDWISE_APP_ORIGIN, norm])];
      return withTenant(db, tenantId, async (tx) => {
        const [existing] = await tx
          .select()
          .from(schema.widgetKeys)
          .where(
            and(
              eq(schema.widgetKeys.label, BUTIKK_TEST_WIDGET_LABEL),
              eq(schema.widgetKeys.active, true),
            ),
          )
          .limit(1);
        if (existing) {
          const next = [...new Set([...existing.allowedOrigins, ...seed])].slice(
            -BUTIKK_TEST_ORIGIN_TAK,
          );
          const samme =
            next.length === existing.allowedOrigins.length &&
            next.every((o) => existing.allowedOrigins.includes(o));
          if (samme) return toKeyView(existing);
          const [updated] = await tx
            .update(schema.widgetKeys)
            .set({ allowedOrigins: next, updatedAt: new Date() })
            .where(eq(schema.widgetKeys.id, existing.id))
            .returning();
          return toKeyView(updated);
        }
        const publishableKey = generatePublishableKey();
        const [row] = await tx
          .insert(schema.widgetKeys)
          .values({
            tenantId,
            publishableKey,
            allowedOrigins: seed,
            label: BUTIKK_TEST_WIDGET_LABEL,
          })
          .returning();
        return toKeyView(row);
      });
    },

    async list(tenantId: string): Promise<WidgetKeyView[]> {
      return withTenant(db, tenantId, async (tx) => {
        const rows = await tx.select().from(schema.widgetKeys);
        return rows.map(toKeyView);
      });
    },

    /**
     * Slå opp tenant + tillatte origins fra en publishable key.
     * Går via `lookup_widget_key` (SECURITY DEFINER + smal GUC-policy).
     * Unscopet `select` mot `widget_keys` gir 0 rader under FORCE RLS —
     * det var produksjons-401 på `/widget/init`.
     */
    async resolveByPublishableKey(publishableKey: string): Promise<WidgetKeyResolution | null> {
      if (!publishableKey?.startsWith('pk_')) return null;
      const res = await db.execute(
        sql`select tenant_id, allowed_origins, active
              from lookup_widget_key(${publishableKey}::text)`,
      );
      const rad = (res.rows ?? res)[0] as
        | {
            tenant_id: string;
            allowed_origins: string[] | null;
            active: boolean;
          }
        | undefined;
      if (!rad?.active) return null;
      const allowed = Array.isArray(rad.allowed_origins) ? rad.allowed_origins : [];
      return { tenantId: rad.tenant_id, allowedOrigins: allowed, active: rad.active };
    },
  };
}

export type WidgetKeyService = ReturnType<typeof createWidgetKeyService>;

/**
 * F4 — Public-safe datatilgang for anonyme widget-kunder. Alt er RLS-scopet til
 * `tenantId` (fra den validerte nøkkelen). En anonym kunde kan kun: se tjenester,
 * se ledige tider, opprette en booking-forespørsel for sin egen henvendelse.
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

  const rader = await tx
    .select({
      id: schema.mechanics.id,
      capacity: schema.mechanics.capacity,
      userId: schema.mechanics.userId,
    })
    .from(schema.mechanics)
    .where(eq(schema.mechanics.active, true));
  /**
   * Timeplan viser aktive mekanikere. Når minst én har userId (knyttet
   * ansatt), er det de som er bookbare. Uten userId (tester, eldre rader)
   * faller vi tilbake til alle aktive — ledig mekaniker = bookbare timer.
   * Ingen dealer_profiles, ingen skill-gate her.
   */
  const medBruker = rader.filter((m) => m.userId);
  const valgte = medBruker.length > 0 ? medBruker : rader;
  const mechanics = valgte.map(({ id, capacity }) => ({ id, capacity }));
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
     * Ledige starttider for en tjeneste på en dag. Returnerer kun tidspunkter
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
     * Opprett en booking-forespørsel fra widgeten. Mekaniker velges server-side
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

/** Ugyldig origin til testnøkkelen (ikke en booking-feil). */
export class WidgetKeyOriginError extends Error {}

export type WidgetPublicService = ReturnType<typeof createWidgetPublicService>;
