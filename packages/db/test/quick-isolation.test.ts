import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, type Database, withTenant } from '../src/client.ts';
import { schema } from '../src/index.ts';

/**
 * F8-01 / F1-07 — Angrepstest for `integration_config`.
 * Quick-tokenet ligger her (envelope-kryptert), så denne tabellen er et
 * høyverdi-mål. Testen beviser at RLS holder: forhandler A når aldri forhandler
 * B sin Quick-config eller token — verken lesing, oppdatering eller innsetting
 * på tvers. Angrepene kjøres som `endwise_app` (authenticated-rollen).
 * Krever Docker-Postgres + `pnpm db:setup` (owner + app-rolle). Uten begge
 * env-URL-ene skippes suiten — samme mønster som f2-isolation.test.ts.
 */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('integration_config: cross-tenant-isolasjon', () => {
  let owner: Database;
  let app: Database;
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const B_TOKEN_CIPHER = 'B-sitt-krypterte-token';

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);

    await owner.insert(schema.tenants).values([
      { id: tenantA, name: 'A', slug: `a-${tenantA.slice(0, 8)}` },
      { id: tenantB, name: 'B', slug: `b-${tenantB.slice(0, 8)}` },
    ]);
    await owner.insert(schema.integrationConfig).values({
      tenantId: tenantB,
      provider: 'quick',
      baseUrl: 'https://q3.quick.no/ProdShared_B',
      tokenCipher: B_TOKEN_CIPHER,
    });
    await owner.insert(schema.syncConflicts).values({
      tenantId: tenantB,
      provider: 'quick',
      entity: 'customer',
      entityId: randomUUID(),
      field: 'phone',
      baseValue: '1',
      ourValue: '9',
      theirValue: '2',
    });
  });

  afterAll(async () => {
    await owner.delete(schema.syncConflicts).where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await owner.delete(schema.integrationConfig).where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await owner.delete(schema.tenants).where(sql`id in (${tenantA}, ${tenantB})`);
  });

  it('ANGREP: A ser ikke B sin Quick-config/token', async () => {
    const rows = await withTenant(app, tenantA, (tx) => tx.select().from(schema.integrationConfig));
    expect(rows).toHaveLength(0);
  });

  it('ANGREP: A kan ikke lese B sitt token med kjent baseUrl', async () => {
    const rows = await withTenant(app, tenantA, (tx) =>
      tx
        .select()
        .from(schema.integrationConfig)
        .where(sql`base_url = 'https://q3.quick.no/ProdShared_B'`),
    );
    expect(rows).toHaveLength(0);
  });

  it('ANGREP: A kan ikke overskrive B sitt token (0 rader)', async () => {
    const res = await withTenant(app, tenantA, (tx) =>
      tx.execute(
        sql`update integration_config set token_cipher = 'stjaalet' where tenant_id = ${tenantB}`,
      ),
    );
    expect(res.rowCount).toBe(0);
    // Bekreft med eier at B sitt token er urørt.
    const [row] = await owner
      .select()
      .from(schema.integrationConfig)
      .where(sql`tenant_id = ${tenantB}`);
    expect(row?.tokenCipher).toBe(B_TOKEN_CIPHER);
  });

  it('ANGREP: A kan ikke plante en config i B (WITH CHECK blokkerer)', async () => {
    await expect(
      withTenant(app, tenantA, (tx) =>
        tx
          .insert(schema.integrationConfig)
          .values({ tenantId: tenantB, provider: 'quick', tokenCipher: 'ondsinnet' }),
      ),
    ).rejects.toThrow();
  });

  it('A kan lese/skrive SIN EGEN Quick-config', async () => {
    await withTenant(app, tenantA, (tx) =>
      tx
        .insert(schema.integrationConfig)
        .values({ tenantId: tenantA, provider: 'quick', baseUrl: 'https://q3.quick.no/A' }),
    );
    const rows = await withTenant(app, tenantA, (tx) => tx.select().from(schema.integrationConfig));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.baseUrl).toBe('https://q3.quick.no/A');
  });

  it('ANGREP: A ser ikke B sine synk-konflikter', async () => {
    const rows = await withTenant(app, tenantA, (tx) => tx.select().from(schema.syncConflicts));
    expect(rows).toHaveLength(0);
  });

  it('ANGREP: A kan ikke løse (oppdatere) B sin konflikt', async () => {
    const res = await withTenant(app, tenantA, (tx) =>
      tx.execute(sql`update sync_conflicts set status = 'resolved' where tenant_id = ${tenantB}`),
    );
    expect(res.rowCount).toBe(0);
    // Bekreft med eier at B sin konflikt fortsatt er åpen.
    const [row] = await owner
      .select()
      .from(schema.syncConflicts)
      .where(sql`tenant_id = ${tenantB}`);
    expect(row?.status).toBe('open');
  });
});
