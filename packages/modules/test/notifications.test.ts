import { randomUUID } from 'node:crypto';
import { createDb, type Database, schema, sql } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NotificationChannel } from '../src/contracts/index.ts';
import { createDispatcher } from '../src/notifications/index.ts';

/** F3-04 — Varsling. Testen som betyr noe: retry sender ikke dobbelt. */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('varsling (F3-04)', () => {
  let owner: Database;
  let app: Database;
  const tenantId = randomUUID();

  /** Teller hvor mange ganger vi FAKTISK sendte. */
  let sendCount = 0;
  const fakeSms: NotificationChannel = {
    kind: 'sms',
    name: 'fake',
    async send() {
      sendCount += 1;
      return { delivered: true, providerMessageId: `msg-${sendCount}` };
    },
  };

  const explodingEmail: NotificationChannel = {
    kind: 'email',
    name: 'exploding',
    async send() {
      throw new Error('leverandøren er nede');
    },
  };

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);
    await owner
      .insert(schema.tenants)
      .values({ id: tenantId, name: 'V', slug: `n-${tenantId.slice(0, 8)}` });
  });

  afterAll(async () => {
    await owner.delete(schema.notifications).where(sql`tenant_id = ${tenantId}`);
    await owner.delete(schema.tenants).where(sql`id = ${tenantId}`);
  });

  it('sender og logger varselet', async () => {
    const dispatcher = createDispatcher(app, [fakeSms]);
    const result = await dispatcher.dispatch({
      tenantId,
      kind: 'sms',
      event: 'booking.confirmed',
      to: '+4790000000',
      body: 'Bookingen din er bekreftet',
      idempotencyKey: `booking.confirmed:${randomUUID()}`,
    });

    expect(result.sent).toBe(true);
    expect(result.duplicate).toBe(false);
  });

  /**
   * DEN VIKTIGE. Vercel Workflows retryer feilede steg. Uten idempotens-vakten
   * ville kunden fått to påminnelser om samme time fordi nettverket hikstet.
   */
  it('IDEMPOTENS: samme nøkkel to ganger → sendes ÉN gang', async () => {
    const dispatcher = createDispatcher(app, [fakeSms]);
    const key = `booking.reminder:${randomUUID()}`;
    const before = sendCount;

    const first = await dispatcher.dispatch({
      tenantId,
      kind: 'sms',
      event: 'booking.reminder',
      to: '+4790000000',
      body: 'Påminnelse',
      idempotencyKey: key,
    });
    const retry = await dispatcher.dispatch({
      tenantId,
      kind: 'sms',
      event: 'booking.reminder',
      to: '+4790000000',
      body: 'Påminnelse',
      idempotencyKey: key,
    });

    expect(first.sent).toBe(true);
    expect(retry.sent).toBe(false);
    expect(retry.duplicate).toBe(true);
    // Kanalen ble kalt nøyaktig én gang, ikke to.
    expect(sendCount - before).toBe(1);
  });

  it('en feilet sending markeres som failed i loggen', async () => {
    const dispatcher = createDispatcher(app, [explodingEmail]);
    const key = `deviation.alert:${randomUUID()}`;

    await expect(
      dispatcher.dispatch({
        tenantId,
        kind: 'email',
        event: 'deviation.alert',
        to: 'selger@forhandler.no',
        subject: 'Avvik',
        body: 'Jobben tar lengre tid',
        idempotencyKey: key,
      }),
    ).rejects.toThrow(/leverandøren er nede/);

    const [row] = await owner
      .select()
      .from(schema.notifications)
      .where(sql`idempotency_key = ${key}`);

    expect(row?.status).toBe('failed');
    expect(row?.error).toContain('leverandøren er nede');
  });

  it('ukjent kanal gir en tydelig feil', async () => {
    const dispatcher = createDispatcher(app, [fakeSms]);
    await expect(
      dispatcher.dispatch({
        tenantId,
        kind: 'email',
        event: 'x',
        to: 'a@b.no',
        body: 'x',
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toThrow(/Ingen kanal registrert/);
  });
});
