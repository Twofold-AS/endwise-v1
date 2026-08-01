import { and, type Database, eq, inArray, schema, sql, withTenant } from '@endwise/db';
import { assertTransition, OCCUPYING_STATUSES } from './lifecycle.ts';

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
  startsAt: Date;
  endsAt: Date;
  customerId?: string | null;
  vehicleId?: string | null;
  source?: string;
  notes?: string | null;
  /** Uten denne er dobbeltklikk to bookinger. */
  idempotencyKey?: string | null;
}

/**
 * Advisory-lås per (tenant, mekaniker).
 *
 * `pg_advisory_xact_lock` — TRANSAKSJONS-skopet, ikke session-skopet. Det er
 * ikke en detalj: med Neons pooler gjenbrukes forbindelser på tvers av
 * forespørsler, og en session-lås ville overlevd transaksjonen og fulgt med
 * neste låner av forbindelsen. Transaksjonslåsen slippes av COMMIT/ROLLBACK,
 * uansett hva som skjer.
 *
 * To bigint-nøkler = (hashtext(tenant), hashtext(mekaniker)). To forhandlere
 * kan booke samtidig; to samtidige bookinger på SAMME mekaniker serialiseres.
 */
function lockMechanic(tenantId: string, mechanicId: string) {
  return sql`select pg_advisory_xact_lock(hashtext(${tenantId}), hashtext(${mechanicId}))`;
}

/**
 * F3-01 — Booking-motoren.
 *
 * Rekkefølgen inne i transaksjonen er hele beskyttelsen:
 *   1. LÅS mekanikeren (advisory, transaksjons-skopet)
 *   2. sjekk idempotensnøkkel — allerede booket? returner den samme
 *   3. sjekk overlapp — noen andre i slotet?
 *   4. skriv
 *
 * Uten steg 1 er steg 3 verdiløs: to samtidige forespørsler ville begge sett
 * «ledig» og begge skrevet. Det er nettopp dobbeltbookingen som ødelegger en
 * verkstedsdag.
 */
export async function createBooking(db: Database, input: CreateBookingInput) {
  if (input.endsAt <= input.startsAt) {
    throw new Error('endsAt må være etter startsAt');
  }

  return withTenant(db, input.tenantId, async (tx) => {
    await tx.execute(lockMechanic(input.tenantId, input.mechanicId));

    if (input.idempotencyKey) {
      const [existing] = await tx
        .select()
        .from(schema.bookings)
        .where(eq(schema.bookings.idempotencyKey, input.idempotencyKey))
        .limit(1);
      // Samme nøkkel = samme forespørsel. Returner det som allerede ble laget.
      if (existing) return existing;
    }

    const [conflict] = await tx
      .select({ id: schema.bookings.id })
      .from(schema.bookings)
      .where(
        and(
          eq(schema.bookings.mechanicId, input.mechanicId),
          inArray(schema.bookings.status, [...OCCUPYING_STATUSES]),
          // Overlapp: [a,b) og [c,d) krysser hvis a < d og c < b.
          // Halvåpne intervaller — en jobb som slutter 10:00 og en som starter
          // 10:00 er IKKE en konflikt.
          sql`${schema.bookings.startsAt} < ${input.endsAt.toISOString()}`,
          sql`${schema.bookings.endsAt} > ${input.startsAt.toISOString()}`,
        ),
      )
      .limit(1);

    if (conflict) throw new SlotConflictError(input.mechanicId);

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

    if (!created) throw new Error('Booking ble ikke opprettet');
    return created;
  });
}

/** F3-01 — Statusendring. Går gjennom livsløps-maskinen, aldri utenom. */
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

    // F1-06: append-only historikk. Samme transaksjon → status og logg kan
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
 * F3-03 — Kalender-API: bookinger i et tidsvindu, valgfritt per mekaniker.
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
