import { randomUUID } from 'node:crypto';
import { createDb, type Database, schema, sql } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { widgetWorkingDay } from '../src/widget/availability.ts';
import { createWidgetPublicService, WidgetBookingError } from '../src/widget/service.ts';

/**
 * F4-20 — serveren avviser en start som ikke finnes i tilgjengeligheten
 * for den serviceVersionId. Klienten er ikke eneste vakt.
 *
 * Krever Docker-Postgres + `pnpm db:setup`. Skippes uten begge env-URL-ene.
 */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('widget booking-forespørsel (F4-20)', () => {
  let owner: Database;
  let app: Database;
  const tenantId = randomUUID();
  const mechanicId = randomUUID();
  const shortServiceId = randomUUID();
  const longServiceId = randomUUID();
  const shortVersionId = randomUUID();
  const longVersionId = randomUUID();
  const day = '2026-09-15';
  const lateStart = new Date(`${day}T15:30:00`);
  const validStart = new Date(`${day}T09:00:00`);

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);

    await owner
      .insert(schema.tenants)
      .values({ id: tenantId, name: 'Widget-verksted', slug: `w-${tenantId.slice(0, 8)}` });
    await owner.insert(schema.mechanics).values({ id: mechanicId, tenantId, name: 'Kari' });
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
        startsAt: new Date(`${day}T08:15:00`),
        customer,
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toThrow(WidgetBookingError);
  });

  it('avviser 15:30 på 180-min tjeneste (passer 30-min)', async () => {
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
});
