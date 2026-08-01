import { randomUUID } from 'node:crypto';
import { createDb, type Database, schema, sql } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eraseCustomer } from '../src/erasure/index.ts';
import { createMessagesModule } from '../src/messages/index.ts';
import { publishEvent } from '../src/stream/index.ts';

/**
 * F14-16 — Sletterutinen, gjennom alle ledd.
 */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('sletterutine (F14-16)', () => {
  let owner: Database;
  let app: Database;
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const kundeA = randomUUID();
  const kundeB = randomUUID();
  const mekaniker = randomUUID();
  const serviceId = randomUUID();
  const versionId = randomUUID();
  const bookingId = randomUUID();
  const vehicleId = randomUUID();

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);

    await owner.insert(schema.tenants).values([
      { id: tenantA, name: 'A', slug: `er-a-${tenantA.slice(0, 6)}` },
      { id: tenantB, name: 'B', slug: `er-b-${tenantB.slice(0, 6)}` },
    ]);
    await owner.insert(schema.customers).values([
      { id: kundeA, tenantId: tenantA, name: 'Ola Nordmann', email: 'ola@example.no' },
      { id: kundeB, tenantId: tenantB, name: 'Kari hos B', email: 'kari@example.no' },
    ]);
    await owner.insert(schema.vehicles).values({
      id: vehicleId,
      tenantId: tenantA,
      customerId: kundeA,
      type: 'mc',
      regNumber: 'AB1234',
    });
    await owner.insert(schema.mechanics).values({ id: mekaniker, tenantId: tenantA, name: 'M' });
    await owner
      .insert(schema.services)
      .values({ id: serviceId, tenantId: tenantA, name: 'S', vehicleType: 'mc' });
    await owner
      .insert(schema.serviceVersions)
      .values({ id: versionId, tenantId: tenantA, serviceId, version: 1, durationMinutes: 60 });
    await owner.insert(schema.bookings).values({
      id: bookingId,
      tenantId: tenantA,
      customerId: kundeA,
      vehicleId,
      mechanicId: mekaniker,
      serviceVersionId: versionId,
      startsAt: new Date('2027-01-05T09:00:00Z'),
      endsAt: new Date('2027-01-05T10:00:00Z'),
      notes: 'Kunden heter Ola og bor i Bergen',
    });

    // Melding, event og audit-rad knyttet til kunden.
    const messages = createMessagesModule(app);
    const thread = await messages.createThread({
      tenantId: tenantA,
      kind: 'customer_dealer',
      participantIds: [kundeA, 'selger-1'],
    });
    await messages.postMessage({
      tenantId: tenantA,
      threadId: thread.id,
      authorId: kundeA,
      body: 'Hei, det er Ola',
    });
    await publishEvent(app, {
      tenantId: tenantA,
      audienceId: kundeA,
      type: 'test.event',
      payload: {},
    });
    await owner.insert(schema.auditLog).values({
      tenantId: tenantA,
      actor: kundeA,
      action: 'booking.created',
      subjectType: 'booking',
      subjectId: bookingId,
      metadata: { navn: 'Ola Nordmann' },
      ipAddress: '10.0.0.1',
    });
  });

  afterAll(async () => {
    for (const t of [tenantA, tenantB]) {
      await owner.delete(schema.erasureRequests).where(sql`tenant_id = ${t}`);
      await owner.delete(schema.streamEvents).where(sql`tenant_id = ${t}`);
      await owner.delete(schema.messages).where(sql`tenant_id = ${t}`);
      await owner.delete(schema.threadParticipants).where(sql`tenant_id = ${t}`);
      await owner.delete(schema.threads).where(sql`tenant_id = ${t}`);
      await owner.delete(schema.bookings).where(sql`tenant_id = ${t}`);
      await owner.delete(schema.serviceVersions).where(sql`tenant_id = ${t}`);
      await owner.delete(schema.services).where(sql`tenant_id = ${t}`);
      await owner.delete(schema.vehicles).where(sql`tenant_id = ${t}`);
      await owner.delete(schema.mechanics).where(sql`tenant_id = ${t}`);
      await owner.delete(schema.auditLog).where(sql`tenant_id = ${t}`);
      await owner.delete(schema.customers).where(sql`tenant_id = ${t}`);
      await owner.delete(schema.tenants).where(sql`id = ${t}`);
    }
  });

  it('sletter kunden, meldingene, notatene og eventene', async () => {
    const report = await eraseCustomer(app, {
      tenantId: tenantA,
      customerId: kundeA,
      requestedBy: 'admin-1',
    });

    expect(report.purged.customers).toBe(1);
    expect(report.purged.messages).toBeGreaterThan(0);
    expect(report.purged.stream_events).toBeGreaterThan(0);

    const kunder = await owner.select().from(schema.customers).where(sql`id = ${kundeA}`);
    expect(kunder).toHaveLength(0);
  });

  /**
   * Bookingen SLETTES ikke — bokføringsloven krever at transaksjonen består.
   * Vi fjerner personen fra den, ikke transaksjonen fra regnskapet.
   */
  it('bookingen består, men er anonymisert', async () => {
    const [booking] = await owner.select().from(schema.bookings).where(sql`id = ${bookingId}`);

    expect(booking).toBeDefined();
    expect(booking?.customerId).toBeNull();
    expect(booking?.notes).toBeNull(); // fritekst som kunne inneholde navn
  });

  it('kjøretøyet består, men koblingen til kunden er brutt', async () => {
    const [vehicle] = await owner.select().from(schema.vehicles).where(sql`id = ${vehicleId}`);
    expect(vehicle?.customerId).toBeNull();
  });

  /**
   * ⚠️ DEN VIKTIGSTE. Audit-loggen er append-only — den KAN ikke slettes av
   * app-rollen. Den redakteres gjennom en SECURITY DEFINER-funksjon, og
   * redaksjonen blir selv en rad i loggen den redigerte.
   */
  it('audit-loggen er REDAKTERT, ikke slettet — og redaksjonen er selv loggført', async () => {
    const rader = await owner.select().from(schema.auditLog).where(sql`tenant_id = ${tenantA}`);

    // Radene finnes fortsatt. Hendelseskjeden er intakt.
    expect(rader.length).toBeGreaterThanOrEqual(2);

    const gammel = rader.find((r) => r.action === 'booking.created');
    expect(gammel?.actor).toBe('[REDAKTERT]');
    expect(gammel?.ipAddress).toBeNull();
    expect(JSON.stringify(gammel?.metadata)).not.toContain('Ola Nordmann');

    // Redaksjonen er selv en hendelse — og DEN raden kan ingen redigere bort.
    const spor = rader.find((r) => r.action === 'audit.redacted');
    expect(spor).toBeDefined();
    expect(spor?.actor).toBe('system:erasure');
  });

  it('ANGREP: app-rollen kan fortsatt IKKE oppdatere audit-loggen direkte', async () => {
    const result = await app.execute(
      sql`update audit_log set actor = 'hacket' where tenant_id = ${tenantA}`,
    );
    // RLS: ingen UPDATE-policy → 0 rader. Redaksjon skjer KUN via funksjonen.
    expect(result.rowCount).toBe(0);
  });

  it('rapporten er ÆRLIG: status «partial» fordi leverandørlogger ikke kan tømmes', async () => {
    const [request] = await owner
      .select()
      .from(schema.erasureRequests)
      .where(sql`subject_id = ${kundeA}`);

    expect(request?.status).toBe('partial');

    const report = request?.report as { notPurgeable?: Array<{ where: string }> };
    expect(report.notPurgeable?.some((v) => v.where === 'mistral')).toBe(true);
  });

  it('sletteforespørselen er loggført og overlever slettingen', async () => {
    const requests = await owner
      .select()
      .from(schema.erasureRequests)
      .where(sql`tenant_id = ${tenantA}`);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.subjectId).toBe(kundeA);
  });

  it('ANGREP: sletting i tenant A rører ikke tenant B sin kunde', async () => {
    const [kunde] = await owner.select().from(schema.customers).where(sql`id = ${kundeB}`);
    expect(kunde).toBeDefined();
    expect(kunde?.name).toBe('Kari hos B');
  });
});
