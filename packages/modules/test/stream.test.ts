import { randomUUID } from 'node:crypto';
import { createDb, type Database, STREAM_CHANNEL, schema, sql } from '@endwise/db';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ConnectionCapError,
  createConnectionRegistry,
  MAX_CONNECTIONS_PER_USER,
  publishEvent,
  readEventsSince,
} from '../src/stream/index.ts';

/**
 * F6-02 — SSE-fundamentet.
 *
 * En SSE-strøm som lekker på tvers av tenants er samme feil som en spørring som
 * gjør det — bare vanskeligere å oppdage. Derfor angripes den her.
 */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('SSE-fundament (F6-02)', () => {
  let owner: Database;
  let app: Database;
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const brukerA = 'user-a';
  const brukerB = 'user-b';

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);
    await owner.insert(schema.tenants).values([
      { id: tenantA, name: 'A', slug: `sa-${tenantA.slice(0, 8)}` },
      { id: tenantB, name: 'B', slug: `sb-${tenantB.slice(0, 8)}` },
    ]);
  });

  afterAll(async () => {
    for (const t of [tenantA, tenantB]) {
      await owner.delete(schema.streamEvents).where(sql`tenant_id = ${t}`);
      await owner.delete(schema.tenants).where(sql`id = ${t}`);
    }
  });

  it('publiserer et event og gir det en monoton id', async () => {
    const event = await publishEvent(app, {
      tenantId: tenantA,
      type: 'booking.updated',
      payload: { bookingId: 'x' },
    });
    expect(event.id).toBeGreaterThan(0);
    expect(event.tenantId).toBe(tenantA);
  });

  /** Kjernen i reconnect: alt du gikk glipp av, i rekkefølge. */
  it('Last-Event-ID spiller av alt etter gitt id', async () => {
    const first = await publishEvent(app, {
      tenantId: tenantA,
      type: 'e1',
      payload: { n: 1 },
    });
    await publishEvent(app, { tenantId: tenantA, type: 'e2', payload: { n: 2 } });
    await publishEvent(app, { tenantId: tenantA, type: 'e3', payload: { n: 3 } });

    const missed = await readEventsSince(app, tenantA, first.id, brukerA);
    expect(missed.map((e) => e.type)).toEqual(['e2', 'e3']);
  });

  it('ANGREP: Last-Event-ID fra tenant B gir A ingenting av B sitt', async () => {
    const bEvent = await publishEvent(app, {
      tenantId: tenantB,
      type: 'hemmelig',
      payload: { secret: 'B sin data' },
    });

    // A prøver å spille av fra en id like FØR B sitt event.
    const leaked = await readEventsSince(app, tenantA, bEvent.id - 1, brukerA);
    expect(leaked.some((e) => e.type === 'hemmelig')).toBe(false);
    expect(leaked.every((e) => e.tenantId === tenantA)).toBe(true);
  });

  /**
   * Innenfor samme tenant: et event adressert til én bruker skal ikke havne
   * hos en annen. RLS ser ikke forskjell på to brukere i samme tenant —
   * `audienceId` er det som gjør det.
   */
  it('ANGREP: privat event til bruker A leveres ikke til bruker B', async () => {
    const before = await publishEvent(app, {
      tenantId: tenantA,
      type: 'marker',
      payload: {},
    });
    await publishEvent(app, {
      tenantId: tenantA,
      type: 'message.created',
      audienceId: brukerA,
      payload: { threadId: 't1' },
    });

    const forB = await readEventsSince(app, tenantA, before.id, brukerB);
    expect(forB.some((e) => e.type === 'message.created')).toBe(false);

    const forA = await readEventsSince(app, tenantA, before.id, brukerA);
    expect(forA.some((e) => e.type === 'message.created')).toBe(true);
  });

  it('event uten audience (hele tenanten) når alle i tenanten', async () => {
    const before = await publishEvent(app, { tenantId: tenantA, type: 'm2', payload: {} });
    await publishEvent(app, {
      tenantId: tenantA,
      type: 'booking.updated',
      audienceId: null,
      payload: { bookingId: 'y' },
    });

    const forB = await readEventsSince(app, tenantA, before.id, brukerB);
    expect(forB.some((e) => e.type === 'booking.updated')).toBe(true);
  });

  /** NOTIFY skal faktisk fyre — ellers er hele live-delen død. */
  it('LISTEN/NOTIFY: publisering utløser et signal på kanalen', async () => {
    const listener = new Client({ connectionString: OWNER_URL as string });
    await listener.connect();
    await listener.query(`LISTEN ${STREAM_CHANNEL}`);

    const received = new Promise<{ id: number; tenantId: string }>((resolve) => {
      listener.on('notification', (msg) => {
        if (msg.payload) resolve(JSON.parse(msg.payload));
      });
    });

    const event = await publishEvent(app, {
      tenantId: tenantA,
      type: 'live.test',
      payload: { hello: 'world' },
    });

    const signal = await received;
    expect(signal.id).toBe(event.id);
    expect(signal.tenantId).toBe(tenantA);
    await listener.end();
  });

  it('NOTIFY-payloaden inneholder ALDRI innhold — kun id, tenant og audience', async () => {
    const listener = new Client({ connectionString: OWNER_URL as string });
    await listener.connect();
    await listener.query(`LISTEN ${STREAM_CHANNEL}`);

    const received = new Promise<Record<string, unknown>>((resolve) => {
      listener.on('notification', (msg) => {
        if (msg.payload) resolve(JSON.parse(msg.payload));
      });
    });

    await publishEvent(app, {
      tenantId: tenantA,
      type: 'message.created',
      payload: { hemmelighet: 'kundens telefonnummer' },
    });

    const signal = await received;
    expect(Object.keys(signal).sort()).toEqual(['audienceId', 'id', 'tenantId']);
    expect(JSON.stringify(signal)).not.toContain('telefonnummer');
    await listener.end();
  });
});

describe('tilkoblings-caps (F6-02)', () => {
  it('stopper en klient som åpner for mange strømmer', () => {
    const registry = createConnectionRegistry();
    const releases = [];
    for (let i = 0; i < MAX_CONNECTIONS_PER_USER; i++) {
      releases.push(registry.acquire('t1', 'u1'));
    }
    expect(() => registry.acquire('t1', 'u1')).toThrow(ConnectionCapError);

    // Slipper man én, er det plass igjen.
    releases[0]?.();
    expect(() => registry.acquire('t1', 'u1')).not.toThrow();
  });

  it('release er idempotent (onAbort og close kan begge fyre)', () => {
    const registry = createConnectionRegistry();
    const release = registry.acquire('t1', 'u2');
    release();
    release();
    expect(registry.count('t1', 'u2')).toBe(0);
  });

  it('en annen bruker rammes ikke av en annens cap', () => {
    const registry = createConnectionRegistry();
    for (let i = 0; i < MAX_CONNECTIONS_PER_USER; i++) registry.acquire('t1', 'u1');
    expect(() => registry.acquire('t1', 'u3')).not.toThrow();
  });
});
