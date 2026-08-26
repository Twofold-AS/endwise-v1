import { randomUUID } from 'node:crypto';
import { createDb, type Database, schema, sql } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMessagesModule, NotAParticipantError } from '../src/messages/index.ts';
import { readEventsSince } from '../src/stream/index.ts';

/** Tråder og meldinger, med begge tilgangslagene angrepet. */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('meldinger (F6-01)', () => {
  let owner: Database;
  let app: Database;
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const kunde = 'kunde-1';
  const selger = 'selger-1';
  const utenforstaende = 'annen-ansatt';

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);
    await owner.insert(schema.tenants).values([
      { id: tenantA, name: 'A', slug: `ma-${tenantA.slice(0, 8)}` },
      { id: tenantB, name: 'B', slug: `mb-${tenantB.slice(0, 8)}` },
    ]);
  });

  afterAll(async () => {
    for (const t of [tenantA, tenantB]) {
      await owner.delete(schema.streamEvents).where(sql`tenant_id = ${t}`);
      await owner.delete(schema.messages).where(sql`tenant_id = ${t}`);
      await owner.delete(schema.threadParticipants).where(sql`tenant_id = ${t}`);
      await owner.delete(schema.threads).where(sql`tenant_id = ${t}`);
      await owner.delete(schema.tenants).where(sql`id = ${t}`);
    }
  });

  it('oppretter tråd, poster melding og teller uleste', async () => {
    const messages = createMessagesModule(app);
    const thread = await messages.createThread({
      tenantId: tenantA,
      kind: 'customer_dealer',
      subject: 'EU-kontroll',
      participantIds: [kunde, selger],
    });

    await messages.postMessage({
      tenantId: tenantA,
      threadId: thread.id,
      authorId: kunde,
      body: 'Når kan dere ta MC-en?',
    });

    const inboks = await messages.listThreads(tenantA, selger);
    expect(inboks).toHaveLength(1);
    expect(inboks[0]?.unread).toBe(1);

    // Kunden har ingen uleste — han skrev den selv.
    const kundensInboks = await messages.listThreads(tenantA, kunde);
    expect(kundensInboks[0]?.unread).toBe(0);
  });

  it('markRead nullstiller uleste', async () => {
    const messages = createMessagesModule(app);
    const [thread] = await messages.listThreads(tenantA, selger);
    if (!thread) throw new Error('mangler tråd');

    await messages.markRead(tenantA, thread.id, selger);
    const etter = await messages.listThreads(tenantA, selger);
    expect(etter[0]?.unread).toBe(0);
  });

  /**
   * RLS holder tenant-grensen. Men innenfor en tenant er ikke enhver ansatt
   * automatisk med i enhver kundesamtale. Deltakelse er kravet.
   */
  it('ANGREP: en ansatt som ikke er deltaker kan ikke lese tråden', async () => {
    const messages = createMessagesModule(app);
    const [thread] = await messages.listThreads(tenantA, selger);
    if (!thread) throw new Error('mangler tråd');

    await expect(messages.listMessages(tenantA, thread.id, utenforstaende)).rejects.toBeInstanceOf(
      NotAParticipantError,
    );
  });

  it('ANGREP: en ikke-deltaker kan ikke poste i tråden', async () => {
    const messages = createMessagesModule(app);
    const [thread] = await messages.listThreads(tenantA, selger);
    if (!thread) throw new Error('mangler tråd');

    await expect(
      messages.postMessage({
        tenantId: tenantA,
        threadId: thread.id,
        authorId: utenforstaende,
        body: 'Hei, jeg skal bare lese litt',
      }),
    ).rejects.toBeInstanceOf(NotAParticipantError);
  });

  it('ANGREP: tenant B ser ikke A sine tråder', async () => {
    const messages = createMessagesModule(app);
    const bInboks = await messages.listThreads(tenantB, selger);
    expect(bInboks).toHaveLength(0);
  });

  /** F6-01 møter F6-02: en melding blir til et event på strømmen. */
  it('en ny melding publiserer et event til MOTTAKEREN, ikke til avsenderen', async () => {
    const messages = createMessagesModule(app);
    const thread = await messages.createThread({
      tenantId: tenantA,
      kind: 'customer_dealer',
      participantIds: [kunde, selger],
    });

    const [markerEvent] = await readEventsSince(app, tenantA, 0, selger, 1);
    const since = markerEvent ? markerEvent.id - 1 : 0;

    await messages.postMessage({
      tenantId: tenantA,
      threadId: thread.id,
      authorId: kunde,
      body: 'Hallo?',
    });

    const forSelger = await readEventsSince(app, tenantA, since, selger);
    expect(forSelger.some((e) => e.type === 'message.created' && e.subjectId === thread.id)).toBe(
      true,
    );

    const forKunde = await readEventsSince(app, tenantA, since, kunde);
    expect(forKunde.some((e) => e.type === 'message.created' && e.subjectId === thread.id)).toBe(
      false,
    );
  });

  it('meldingsteksten ligger ALDRI i event-payloaden', async () => {
    const events = await readEventsSince(app, tenantA, 0, selger);
    const dump = JSON.stringify(events);
    expect(dump).not.toContain('Hallo?');
    expect(dump).not.toContain('Når kan dere ta MC-en?');
  });
});
