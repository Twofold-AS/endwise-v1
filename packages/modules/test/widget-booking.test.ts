import { randomUUID } from 'node:crypto';
import { createDb, type Database, schema, sql } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createBooking } from '../src/booking/engine.ts';
import { widgetWallTime, widgetWorkingDay } from '../src/widget/availability.ts';
import { createWidgetPublicService, WidgetBookingError } from '../src/widget/service.ts';

/**
 * F4-20 + CWE-367/841 — serveren avviser start utenfor tilgjengelighet,
 * avviser når shopen er full, og serialiserer siste slot (ingen race).
 * Krever Docker-Postgres + `pnpm db:setup`. Skippes uten begge env-URL-ene
 * (ikke for å skjule tidssone — den dekkes av widget-security, som alltid kjører).
 */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('widget booking-forespørsel (F4-20 + kapasitet)', () => {
  let owner: Database;
  let app: Database;
  const tenantId = randomUUID();
  const mechanicA = randomUUID();
  const mechanicB = randomUUID();
  const shortServiceId = randomUUID();
  const longServiceId = randomUUID();
  const shortVersionId = randomUUID();
  const longVersionId = randomUUID();
  const day = '2026-09-15';
  const lateStart = widgetWallTime(day, 15, 30);
  const validStart = widgetWallTime(day, 9, 0);
  const fullStart = widgetWallTime(day, 10, 0);
  const raceStart = widgetWallTime(day, 11, 0);

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);

    await owner
      .insert(schema.tenants)
      .values({ id: tenantId, name: 'Widget-verksted', slug: `w-${tenantId.slice(0, 8)}` });
    await owner.insert(schema.mechanics).values([
      { id: mechanicA, tenantId, name: 'Kari' },
      { id: mechanicB, tenantId, name: 'Ola' },
    ]);
    await owner.insert(schema.services).values([
      { id: shortServiceId, tenantId, name: 'Dekkskift', vehicleType: 'mc' },
      { id: longServiceId, tenantId, name: 'Stor service', vehicleType: 'mc' },
    ]);
    await owner.insert(schema.serviceVersions).values([
      {
        id: shortVersionId,
        tenantId,
        serviceId: shortServiceId,
        version: 1,
        durationMinutes: 30,
      },
      {
        id: longVersionId,
        tenantId,
        serviceId: longServiceId,
        version: 1,
        durationMinutes: 180,
      },
    ]);
  });

  afterAll(async () => {
    await owner.delete(schema.bookings).where(sql`tenant_id = ${tenantId}`);
    await owner.delete(schema.customers).where(sql`tenant_id = ${tenantId}`);
    await owner.delete(schema.serviceVersions).where(sql`tenant_id = ${tenantId}`);
    await owner.delete(schema.services).where(sql`tenant_id = ${tenantId}`);
    await owner.delete(schema.mechanics).where(sql`tenant_id = ${tenantId}`);
    await owner.delete(schema.auditLog).where(sql`tenant_id = ${tenantId}`);
    await owner.delete(schema.tenants).where(sql`id = ${tenantId}`);
  });

  const customer = { name: 'Ola Nordmann', phone: '40000000' };

  it('avviser start som ikke er i rutenettet', async () => {
    const svc = createWidgetPublicService(app);
    await expect(
      svc.createBookingRequest(tenantId, {
        serviceVersionId: shortVersionId,
        startsAt: widgetWallTime(day, 8, 15),
        customer,
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toThrow(WidgetBookingError);
  });

  it('avviser 15:30 Oslo på 180-min tjeneste (passer 30-min)', async () => {
    const svc = createWidgetPublicService(app);
    const { dayStart, dayEnd } = widgetWorkingDay(day);
    const shortSlots = await svc.availableSlots(tenantId, {
      serviceVersionId: shortVersionId,
      dayStart,
      dayEnd,
      stepMinutes: 30,
    });
    expect(shortSlots.some((s) => s.getTime() === lateStart.getTime())).toBe(true);

    await expect(
      svc.createBookingRequest(tenantId, {
        serviceVersionId: longVersionId,
        startsAt: lateStart,
        customer,
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toThrow(/ikke ledig/i);
  });

  it('godtar en start som finnes i tilgjengeligheten', async () => {
    const svc = createWidgetPublicService(app);
    const result = await svc.createBookingRequest(tenantId, {
      serviceVersionId: shortVersionId,
      startsAt: validStart,
      customer,
      idempotencyKey: randomUUID(),
    });
    expect(result.bookingId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(result.status).toBe('draft');
  });

  it('CWE-841: avviser når shopen er full (begge mekanikere booket)', async () => {
    const endsAt = new Date(fullStart.getTime() + 30 * 60_000);
    await createBooking(app, {
      tenantId,
      mechanicId: mechanicA,
      serviceVersionId: shortVersionId,
      startsAt: fullStart,
      endsAt,
      idempotencyKey: randomUUID(),
    });
    await createBooking(app, {
      tenantId,
      mechanicId: mechanicB,
      serviceVersionId: shortVersionId,
      startsAt: fullStart,
      endsAt,
      idempotencyKey: randomUUID(),
    });

    await expect(
      createWidgetPublicService(app).createBookingRequest(tenantId, {
        serviceVersionId: shortVersionId,
        startsAt: fullStart,
        customer,
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toThrow(/ikke ledig/i);
  });

  it('CWE-367: to parallelle widget-bookinger på siste slot → nøyaktig én vinner', async () => {
    const endsAt = new Date(raceStart.getTime() + 30 * 60_000);
    await createBooking(app, {
      tenantId,
      mechanicId: mechanicA,
      serviceVersionId: shortVersionId,
      startsAt: raceStart,
      endsAt,
      idempotencyKey: randomUUID(),
    });

    const svc = createWidgetPublicService(app);
    const results = await Promise.allSettled([
      svc.createBookingRequest(tenantId, {
        serviceVersionId: shortVersionId,
        startsAt: raceStart,
        customer: { name: 'A', phone: '40000001' },
        idempotencyKey: randomUUID(),
      }),
      svc.createBookingRequest(tenantId, {
        serviceVersionId: shortVersionId,
        startsAt: raceStart,
        customer: { name: 'B', phone: '40000002' },
        idempotencyKey: randomUUID(),
      }),
    ]);

    const ok = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect((failed[0] as PromiseRejectedResult).reason).toBeInstanceOf(WidgetBookingError);
  });

  it('CWE-841: to mekanikere, to samtidige bookinger på ledig slot → begge får plass', async () => {
    const start = widgetWallTime(day, 13, 0);
    const svc = createWidgetPublicService(app);
    const results = await Promise.allSettled([
      svc.createBookingRequest(tenantId, {
        serviceVersionId: shortVersionId,
        startsAt: start,
        customer: { name: 'C', phone: '40000003' },
        idempotencyKey: randomUUID(),
      }),
      svc.createBookingRequest(tenantId, {
        serviceVersionId: shortVersionId,
        startsAt: start,
        customer: { name: 'D', phone: '40000004' },
        idempotencyKey: randomUUID(),
      }),
    ]);

    const ok = results.filter((r) => r.status === 'fulfilled');
    expect(ok).toHaveLength(2);
    const ids = ok.map((r) => (r as PromiseFulfilledResult<{ bookingId: string }>).value.bookingId);
    expect(new Set(ids).size).toBe(2);
  });
});
