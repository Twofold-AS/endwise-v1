import { and, type Database, eq, inArray, schema, sql, withTenant } from '@endwise/db';
import { assertTransition, OCCUPYING_STATUSES } from './lifecycle.ts';
import {
  endsAtFromDuration,
  MAX_DURATION_MINUTES,
  MIN_DURATION_MINUTES,
  resolveServiceVersionIds,
  resolveSlotMinutes,
} from './lines.ts';

export class SlotConflictError extends Error {
  readonly code = 'SLOT_CONFLICT';
  constructor(mechanicId: string) {
    super(`Mekaniker ${mechanicId} er allerede opptatt i dette tidsrommet`);
  }
}

export class BookingNotFoundError extends Error {
  readonly code = 'BOOKING_NOT_FOUND';
  constructor(id: string) {
    super(`Booking ${id} finnes ikke`);
  }
}

export interface CreateBookingInput {
  tenantId: string;
  mechanicId: string;
  serviceVersionId: string;
  /** Øvrige tjenesteversjoner på samme jobb. Primær skal ikke gjentas. */
  extraServiceVersionIds?: string[];
  startsAt: Date;
  endsAt: Date;
  /**
   * Manuell slot-lengde i minutter. Når satt, overstyrer `endsAt`
   * (`startsAt + durationMinutes`). Katalogen er default i UI-et.
   */
  durationMinutes?: number | null;
  customerId?: string | null;
  vehicleId?: string | null;
  source?: string;
  notes?: string | null;
  /** Uten denne er dobbeltklikk to bookinger. */
  idempotencyKey?: string | null;
}

/**
 * Advisory-låser — transaksjons-skopet (`pg_advisory_xact_lock`), ikke session.
 * Går man gjennom en pooler (pgbouncer) gjenbrukes forbindelser; en session-lås
 * ville fulgt med neste låner. Transaksjonslåsen slippes av commit/rollback.
 * To bigint-nøkler = (hashtext(tenant), hashtext(ressurs)).
 * Rekkefølge alltid: shop først, deretter mekaniker — ellers deadlock.
 */
export type TenantTx = Parameters<Parameters<Database['transaction']>[0]>[0];

/** Shop-lås: serialiserer kapasitets-sjekk + skriving for hele verkstedet. */
export function lockShopSlots(tenantId: string) {
  return sql`select pg_advisory_xact_lock(hashtext(${tenantId}), hashtext('booking-slots'))`;
}

export function lockMechanic(tenantId: string, mechanicId: string) {
  return sql`select pg_advisory_xact_lock(hashtext(${tenantId}), hashtext(${mechanicId}))`;
}

/**
 * Skriv booking. Kalleren MÅ holde shop-lås + mekaniker-lås i samme
 * `withTenant`-transaksjon. Idempotens + kapasitet mot mekanikerens `capacity`.
 */
export async function writeBooking(tx: TenantTx, input: CreateBookingInput) {
  if (input.idempotencyKey) {
    const [existing] = await tx
      .select()
      .from(schema.bookings)
      .where(eq(schema.bookings.idempotencyKey, input.idempotencyKey))
      .limit(1);
    if (existing) return existing;
  }

  const [mech] = await tx
    .select({ capacity: schema.mechanics.capacity })
    .from(schema.mechanics)
    .where(eq(schema.mechanics.id, input.mechanicId))
    .limit(1);
  const cap = mech?.capacity ?? 1;

  const overlapping = await tx
    .select({ id: schema.bookings.id })
    .from(schema.bookings)
    .where(
      and(
        eq(schema.bookings.mechanicId, input.mechanicId),
        inArray(schema.bookings.status, [...OCCUPYING_STATUSES]),
        // Overlapp: [a,b) og [c,d) krysser hvis a < d og c < b.
        sql`${schema.bookings.startsAt} < ${input.endsAt.toISOString()}`,
        sql`${schema.bookings.endsAt} > ${input.startsAt.toISOString()}`,
      ),
    );

  if (overlapping.length >= cap) throw new SlotConflictError(input.mechanicId);

  const [created] = await tx
    .insert(schema.bookings)
    .values({
      tenantId: input.tenantId,
      mechanicId: input.mechanicId,
      serviceVersionId: input.serviceVersionId,
      customerId: input.customerId ?? null,
      vehicleId: input.vehicleId ?? null,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      idempotencyKey: input.idempotencyKey ?? null,
      source: input.source ?? 'admin',
      notes: input.notes ?? null,
      status: 'draft',
    })
    .returning();

  if (!created) throw new Error('Jobben ble ikke opprettet');

  const versionIds = resolveServiceVersionIds(
    input.serviceVersionId,
    input.extraServiceVersionIds ?? [],
  );
  const versions = await tx
    .select({
      id: schema.serviceVersions.id,
      durationMinutes: schema.serviceVersions.durationMinutes,
    })
    .from(schema.serviceVersions)
    .where(inArray(schema.serviceVersions.id, versionIds));
  if (versions.length !== versionIds.length) {
    throw new Error('En eller flere tjenester finnes ikke');
  }
  const durationById = new Map(versions.map((v) => [v.id, v.durationMinutes]));

  await tx.insert(schema.bookingServices).values(
    versionIds.map((serviceVersionId, sortOrder) => ({
      tenantId: input.tenantId,
      bookingId: created.id,
      serviceVersionId,
      durationMinutes: durationById.get(serviceVersionId) ?? 0,
      sortOrder,
    })),
  );

  return created;
}

/**
 * Booking-motoren.
 * Rekkefølgen inne i transaksjonen er hele beskyttelsen:
 * 1. Lås verkstedet (shop-kapasitet) deretter mekanikeren
 * 2. sjekk idempotensnøkkel — allerede booket? returner den samme
 * 3. sjekk overlapp mot mekanikerens kapasitet
 * 4. skriv
 */
export async function createBooking(db: Database, input: CreateBookingInput) {
  const slotMinutes =
    input.durationMinutes != null
      ? resolveSlotMinutes(0, input.durationMinutes)
      : Math.round((input.endsAt.getTime() - input.startsAt.getTime()) / 60_000);
  if (slotMinutes < MIN_DURATION_MINUTES || slotMinutes > MAX_DURATION_MINUTES) {
    throw new Error(
      `Varighet må være mellom ${MIN_DURATION_MINUTES} og ${MAX_DURATION_MINUTES} minutter`,
    );
  }
  const endsAt =
    input.durationMinutes != null ? endsAtFromDuration(input.startsAt, slotMinutes) : input.endsAt;
  if (endsAt <= input.startsAt) {
    throw new Error('endsAt må være etter startsAt');
  }

  return withTenant(db, input.tenantId, async (tx) => {
    await tx.execute(lockShopSlots(input.tenantId));
    await tx.execute(lockMechanic(input.tenantId, input.mechanicId));
    return writeBooking(tx, { ...input, endsAt, durationMinutes: slotMinutes });
  });
}

/** Statusendring. Går gjennom livsløps-maskinen, aldri utenom. */
export async function transitionBooking(
  db: Database,
  tenantId: string,
  bookingId: string,
  to: Parameters<typeof assertTransition>[1],
  /** Hvem utførte endringen (bruker-ID). Havner i audit-loggen (F1-06). */
  actor = 'system',
) {
  return withTenant(db, tenantId, async (tx) => {
    const [booking] = await tx
      .select()
      .from(schema.bookings)
      .where(eq(schema.bookings.id, bookingId))
      .limit(1);
    if (!booking) throw new BookingNotFoundError(bookingId);

    assertTransition(booking.status, to);

    const [updated] = await tx
      .update(schema.bookings)
      .set({ status: to, updatedAt: new Date() })
      .where(eq(schema.bookings.id, bookingId))
      .returning();

    // Append-only historikk. Samme transaksjon → status og logg kan
    // aldri komme ut av synk. RLS (withTenant) garanterer riktig tenant.
    await tx.insert(schema.auditLog).values({
      tenantId,
      actor,
      action: `booking.${to}`,
      subjectType: 'booking',
      subjectId: bookingId,
      metadata: { from: booking.status, to },
    });

    return updated;
  });
}

/**
 * Kalender-API: bookinger i et tidsvindu, valgfritt per mekaniker.
 */
export async function listBookings(
  db: Database,
  tenantId: string,
  window: { from: Date; to: Date; mechanicId?: string },
) {
  return withTenant(db, tenantId, (tx) => {
    const conditions = [
      sql`${schema.bookings.startsAt} < ${window.to.toISOString()}`,
      sql`${schema.bookings.endsAt} > ${window.from.toISOString()}`,
    ];
    if (window.mechanicId) {
      conditions.push(eq(schema.bookings.mechanicId, window.mechanicId));
    }
    return tx
      .select()
      .from(schema.bookings)
      .where(and(...conditions))
      .orderBy(schema.bookings.startsAt);
  });
}
