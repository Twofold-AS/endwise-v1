import { randomUUID } from 'node:crypto';
import { createDb, type Database, schema, sql } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createBooking, SlotConflictError, transitionBooking } from '../src/booking/index.ts';

/**
 * F3-01 — Booking-motoren, testet der den kan feile: samtidighet.
 *
 * Alt kjøres som `endwise_app` (RLS på), akkurat som i produksjon.
 */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('booking-motor (F3-01)', () => {
  let owner: Database;
  let app: Database;
  const tenantId = randomUUID();
  const mechanicId = randomUUID();
  const otherMechanicId = randomUUID();
  const serviceId = randomUUID();
  const versionId = randomUUID();
  const extraServiceId = randomUUID();
  const extraVersionId = randomUUID();

  const start = new Date('2026-08-03T09:00:00Z');
  const end = new Date('2026-08-03T10:00:00Z');

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);

    await owner
      .insert(schema.tenants)
      .values({ id: tenantId, name: 'Verksted', slug: `v-${tenantId.slice(0, 8)}` });
    await owner.insert(schema.mechanics).values([
      { id: mechanicId, tenantId, name: 'Kari' },
      { id: otherMechanicId, tenantId, name: 'Ola' },
    ]);
    await owner
      .insert(schema.services)
      .values({ id: serviceId, tenantId, name: 'EU-kontroll MC', vehicleType: 'mc' });
    await owner.insert(schema.serviceVersions).values({
      id: versionId,
      tenantId,
      serviceId,
      version: 1,
      durationMinutes: 60,
      skills: ['mc-eu'],
    });
    await owner
      .insert(schema.services)
      .values({ id: extraServiceId, tenantId, name: 'Oljeskift', vehicleType: 'mc' });
    await owner.insert(schema.serviceVersions).values({
      id: extraVersionId,
      tenantId,
      serviceId: extraServiceId,
      version: 1,
      durationMinutes: 30,
      skills: ['olje'],
    });
  });

  afterAll(async () => {
    await owner.delete(schema.bookingServices).where(sql`tenant_id = ${tenantId}`);
    await owner.delete(schema.bookings).where(sql`tenant_id = ${tenantId}`);
    await owner.delete(schema.serviceVersions).where(sql`tenant_id = ${tenantId}`);
    await owner.delete(schema.services).where(sql`tenant_id = ${tenantId}`);
    await owner.delete(schema.mechanics).where(sql`tenant_id = ${tenantId}`);
    /**
     * ⚠️ Revisjonsloggen må ryddes FØR tenanten. Booking-overgangene skriver
     * `audit_log`-rader (F0-13) med en FK til `tenants`, så en `delete from
     * tenants` uten dette feiler på fremmednøkkelen — og det er FK-en som gjør
     * jobben sin: en revisjonslogg skal ikke kunne bli foreldreløs i stillhet.
     */
    await owner.delete(schema.auditLog).where(sql`tenant_id = ${tenantId}`);
    await owner.delete(schema.tenants).where(sql`id = ${tenantId}`);
  });

  const base = () => ({
    tenantId,
    mechanicId,
    serviceVersionId: versionId,
    startsAt: start,
    endsAt: end,
  });

  it('oppretter en booking i status draft', async () => {
    const booking = await createBooking(app, { ...base(), idempotencyKey: randomUUID() });
    expect(booking.status).toBe('draft');
    expect(booking.mechanicId).toBe(mechanicId);
  });

  it('KONFLIKT: samme mekaniker, overlappende tid → avvist', async () => {
    await expect(
      createBooking(app, {
        ...base(),
        startsAt: new Date('2026-08-03T09:30:00Z'),
        endsAt: new Date('2026-08-03T10:30:00Z'),
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(SlotConflictError);
  });

  it('tilstøtende slot er IKKE konflikt (halvåpne intervaller)', async () => {
    const booking = await createBooking(app, {
      ...base(),
      startsAt: new Date('2026-08-03T10:00:00Z'),
      endsAt: new Date('2026-08-03T11:00:00Z'),
      idempotencyKey: randomUUID(),
    });
    expect(booking.id).toBeTruthy();
  });

  it('en annen mekaniker i samme tid er lov', async () => {
    const booking = await createBooking(app, {
      ...base(),
      mechanicId: otherMechanicId,
      idempotencyKey: randomUUID(),
    });
    expect(booking.mechanicId).toBe(otherMechanicId);
  });

  /**
   * DEN VIKTIGE. Uten pg_advisory_xact_lock ville begge forespørslene sett
   * «ledig» samtidig og begge skrevet — dobbeltbooking.
   */
  it('SAMTIDIGHET: to parallelle bookinger på samme slot → nøyaktig én vinner', async () => {
    const slot = {
      startsAt: new Date('2026-08-04T09:00:00Z'),
      endsAt: new Date('2026-08-04T10:00:00Z'),
    };

    const results = await Promise.allSettled([
      createBooking(app, { ...base(), ...slot, idempotencyKey: randomUUID() }),
      createBooking(app, { ...base(), ...slot, idempotencyKey: randomUUID() }),
    ]);

    const ok = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect((failed[0] as PromiseRejectedResult).reason).toBeInstanceOf(SlotConflictError);
  });

  it('IDEMPOTENS: samme nøkkel to ganger → samme booking, ikke to', async () => {
    const key = randomUUID();
    const slot = {
      startsAt: new Date('2026-08-05T09:00:00Z'),
      endsAt: new Date('2026-08-05T10:00:00Z'),
    };

    const first = await createBooking(app, { ...base(), ...slot, idempotencyKey: key });
    const second = await createBooking(app, { ...base(), ...slot, idempotencyKey: key });

    expect(second.id).toBe(first.id);
  });

  it('LIVSLØP: draft → confirmed → in_progress → completed', async () => {
    const booking = await createBooking(app, {
      ...base(),
      startsAt: new Date('2026-08-06T09:00:00Z'),
      endsAt: new Date('2026-08-06T10:00:00Z'),
      idempotencyKey: randomUUID(),
    });

    await transitionBooking(app, tenantId, booking.id, 'confirmed');
    await transitionBooking(app, tenantId, booking.id, 'in_progress');
    const done = await transitionBooking(app, tenantId, booking.id, 'completed');
    expect(done?.status).toBe('completed');
  });

  it('LIVSLØP: en fullført booking kan ikke kanselleres', async () => {
    const booking = await createBooking(app, {
      ...base(),
      startsAt: new Date('2026-08-07T09:00:00Z'),
      endsAt: new Date('2026-08-07T10:00:00Z'),
      idempotencyKey: randomUUID(),
    });
    await transitionBooking(app, tenantId, booking.id, 'confirmed');
    await transitionBooking(app, tenantId, booking.id, 'in_progress');
    await transitionBooking(app, tenantId, booking.id, 'completed');

    await expect(transitionBooking(app, tenantId, booking.id, 'cancelled')).rejects.toThrow(
      /Ulovlig statusovergang/,
    );
  });

  it('en kansellert booking frigjør slotet', async () => {
    const slot = {
      startsAt: new Date('2026-08-08T09:00:00Z'),
      endsAt: new Date('2026-08-08T10:00:00Z'),
    };
    const first = await createBooking(app, { ...base(), ...slot, idempotencyKey: randomUUID() });
    await transitionBooking(app, tenantId, first.id, 'cancelled');

    const second = await createBooking(app, { ...base(), ...slot, idempotencyKey: randomUUID() });
    expect(second.id).not.toBe(first.id);
  });

  it('FLERE TJENESTER: én jobb får to linjer, primær står på bookingen', async () => {
    const booking = await createBooking(app, {
      ...base(),
      extraServiceVersionIds: [extraVersionId],
      startsAt: new Date('2026-08-09T09:00:00Z'),
      endsAt: new Date('2026-08-09T10:30:00Z'),
      idempotencyKey: randomUUID(),
    });
    expect(booking.serviceVersionId).toBe(versionId);

    const lines = await owner
      .select()
      .from(schema.bookingServices)
      .where(sql`booking_id = ${booking.id}`);
    expect(lines).toHaveLength(2);
    expect(lines.map((l) => l.serviceVersionId).sort()).toEqual([versionId, extraVersionId].sort());
    expect(lines.reduce((sum, l) => sum + l.durationMinutes, 0)).toBe(90);
  });

  it('MANUELL VARIGHET: durationMinutes styrer slot, ikke katalogdefault', async () => {
    const start = new Date('2026-08-10T09:00:00Z');
    const booking = await createBooking(app, {
      ...base(),
      extraServiceVersionIds: [extraVersionId],
      startsAt: start,
      endsAt: new Date('2026-08-10T10:00:00Z'),
      durationMinutes: 75,
      idempotencyKey: randomUUID(),
    });
    expect(booking.endsAt.getTime() - booking.startsAt.getTime()).toBe(75 * 60_000);
    expect(booking.endsAt.toISOString()).toBe('2026-08-10T10:15:00.000Z');
  });
});
