import { randomUUID } from 'node:crypto';
import { createDb, type Database, schema, sql } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  AI_LOG_RETENTION_DAYS_DEFAULT,
  aiLogRetentionDays,
  prunableRules,
  pruneExpired,
  RETENTION_POLICY,
  ruleFor,
} from '../src/retention/index.ts';

/** Logg-policyen. Implementert, ikke bare dokumentert. */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describe('retensjonspolicy (F14-03)', () => {
  it('hver regel har en begrunnelse — en retensjonstid uten begrunnelse er en gjetning', () => {
    for (const rule of RETENTION_POLICY) {
      expect(rule.rationale.length).toBeGreaterThan(20);
      expect(rule.access.length).toBeGreaterThan(0);
    }
  });

  it('audit-loggen REDAKTERES, den slettes ikke', () => {
    expect(ruleFor('audit_log')?.mode).toBe('redact');
  });

  it('sletteforespørsler slettes ALDRI (days: 0) — beviset må overleve slettingen', () => {
    expect(ruleFor('erasure_requests')?.days).toBe(0);
    expect(prunableRules().map((r) => r.table)).not.toContain('erasure_requests');
  });

  it('stream_events og AI-logger slettes automatisk (konfigurerbar, default 7 dager)', () => {
    expect(ruleFor('stream_events')?.mode).toBe('delete');
    expect(ruleFor('stream_events')?.days).toBeGreaterThan(0);
    expect(ruleFor('stream_events')?.days).toBeLessThanOrEqual(365);
    expect(AI_LOG_RETENTION_DAYS_DEFAULT).toBe(7);
    expect(aiLogRetentionDays({})).toBe(AI_LOG_RETENTION_DAYS_DEFAULT);
    expect(aiLogRetentionDays({ AI_LOG_RETENTION_DAYS: '14' })).toBe(14);
    expect(aiLogRetentionDays({ AI_LOG_RETENTION_DAYS: 'nei' })).toBe(
      AI_LOG_RETENTION_DAYS_DEFAULT,
    );
  });
});

describeDb('automatisk sletting (F14-03)', () => {
  let owner: Database;
  let app: Database;
  const tenantId = randomUUID();
  const tenantB = randomUUID();

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);
    await owner.insert(schema.tenants).values([
      { id: tenantId, name: 'R', slug: `ret-${tenantId.slice(0, 8)}` },
      { id: tenantB, name: 'RB', slug: `retb-${tenantB.slice(0, 8)}` },
    ]);

    const rule = ruleFor('stream_events');
    const gammelDager = (rule?.days ?? 30) + 1;
    // Ett gammelt event (retensjon + 1 dag) og ett ferskt, i hver tenant.
    for (const t of [tenantId, tenantB]) {
      await owner.execute(sql`
        insert into stream_events (tenant_id, type, payload, created_at)
        values (${t}, 'gammel', '{}'::jsonb, now() - ${gammelDager} * interval '1 day'),
               (${t}, 'fersk',  '{}'::jsonb, now())
      `);
    }
  });

  afterAll(async () => {
    for (const t of [tenantId, tenantB]) {
      await owner.delete(schema.streamEvents).where(sql`tenant_id = ${t}`);
      await owner.delete(schema.tenants).where(sql`id = ${t}`);
    }
  });

  it('sletter det som er eldre enn retensjonstiden, og bare det', async () => {
    const results = await pruneExpired(app, tenantId);
    const stream = results.find((r) => r.table === 'stream_events');
    expect(stream?.deleted).toBe(1);

    const igjen = await owner
      .select()
      .from(schema.streamEvents)
      .where(sql`tenant_id = ${tenantId}`);
    expect(igjen).toHaveLength(1);
    expect(igjen[0]?.type).toBe('fersk');
  });

  /** Ryddejobben går gjennom RLS. Den kan ikke tømme feil forhandler. */
  it('ANGREP: rydding i tenant A rører ikke tenant B', async () => {
    const bRader = await owner
      .select()
      .from(schema.streamEvents)
      .where(sql`tenant_id = ${tenantB}`);
    expect(bRader).toHaveLength(2);
  });
});
