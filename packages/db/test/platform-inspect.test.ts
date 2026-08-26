import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, type Database, withPlatformInspect } from '../src/client.ts';
import { schema } from '../src/index.ts';

/**
 * Mons P0 — inspect-guc skal ikke åpne hele tenanten.
 * Angrep kjøres som app-rollen (force RLS).
 */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('platform_inspect — smal SELECT, ingen PII-dump', () => {
  let owner: Database;
  let app: Database;
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const kundeA = randomUUID();
  const mekA = randomUUID();

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);
    await owner.insert(schema.tenants).values([
      { id: tenantA, name: 'Inspect A', slug: `ia-${tenantA.slice(0, 8)}` },
      { id: tenantB, name: 'Inspect B', slug: `ib-${tenantB.slice(0, 8)}` },
    ]);
    await owner.insert(schema.customers).values({
      id: kundeA,
      tenantId: tenantA,
      name: 'Hemmelig kunde',
      email: 'hemmelig@example.com',
      phone: '99999999',
    });
    await owner.insert(schema.mechanics).values({
      id: mekA,
      tenantId: tenantA,
      name: 'Mek A',
    });
  });

  afterAll(async () => {
    await owner.delete(schema.mechanics).where(sql`id = ${mekA}`);
    await owner.delete(schema.customers).where(sql`id = ${kundeA}`);
    await owner.delete(schema.tenants).where(sql`id in (${tenantA}, ${tenantB})`);
  });

  it('⛔ ANGREP: inspect ser ikke customers (e-post/telefon)', async () => {
    const rader = await withPlatformInspect(app, tenantA, (tx) =>
      tx.select().from(schema.customers),
    );
    expect(rader).toHaveLength(0);
  });

  it('inspect ser mekanikere på GUC-tenanten, ikke den andre', async () => {
    const a = await withPlatformInspect(app, tenantA, (tx) => tx.select().from(schema.mechanics));
    expect(a.some((r) => r.id === mekA)).toBe(true);
    const b = await withPlatformInspect(app, tenantB, (tx) => tx.select().from(schema.mechanics));
    expect(b).toHaveLength(0);
  });

  it('⛔ ANGREP: inspect er READ ONLY — skriving feiler', async () => {
    await expect(
      withPlatformInspect(app, tenantA, (tx) =>
        tx.insert(schema.mechanics).values({ tenantId: tenantA, name: 'Hack' }),
      ),
    ).rejects.toThrow();
  });
});
