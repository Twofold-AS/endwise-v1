import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, type Database, withTenant } from '../src/client.ts';
import { schema } from '../src/index.ts';

/**
 * F1-08 — Automatiserte cross-tenant-angrep.
 *
 * Hver test her ER et angrep. Består den, betyr det at DATABASEN stoppet
 * angrepet — ikke at koden vår oppførte seg pent.
 *
 * To forbindelser, og det er hele poenget:
 *   - owner (DATABASE_URL)     eier tabellene. RLS gjelder IKKE for eieren.
 *                              Brukes kun til seeding/opprydding.
 *   - app   (APP_DATABASE_URL) er `endwise_app` (medlem av `authenticated`).
 *                              Alle angrep kjøres herfra. Dette er rollen
 *                              applikasjonen faktisk bruker i runtime.
 *
 * Kjørte vi angrepene som eier, ville alt "bestått" fordi RLS var usynlig.
 * Det ville vært den farligste grønne testen i repoet.
 */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('tenant-isolasjon (RLS)', () => {
  let owner: Database;
  let app: Database;
  const tenantA = randomUUID();
  const tenantB = randomUUID();

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);

    await owner.insert(schema.tenants).values([
      { id: tenantA, name: 'Forhandler A', slug: `a-${tenantA.slice(0, 8)}` },
      { id: tenantB, name: 'Forhandler B', slug: `b-${tenantB.slice(0, 8)}` },
    ]);
    await owner.insert(schema.tenantModules).values([
      { tenantId: tenantA, moduleKey: 'booking' },
      { tenantId: tenantB, moduleKey: 'messages' },
    ]);
  });

  afterAll(async () => {
    await owner.delete(schema.auditLog).where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await owner.delete(schema.tenantModules).where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await owner.delete(schema.tenants).where(sql`id in (${tenantA}, ${tenantB})`);
  });

  it('ser kun egne moduler i egen tenant-kontekst', async () => {
    const rows = await withTenant(app, tenantA, (tx) => tx.select().from(schema.tenantModules));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.tenantId === tenantA)).toBe(true);
  });

  it('ANGREP: kan ikke lese en annen tenants rader, selv med eksplisitt tenant_id', async () => {
    const rows = await withTenant(app, tenantA, (tx) =>
      tx.select().from(schema.tenantModules).where(sql`tenant_id = ${tenantB}`),
    );
    expect(rows).toHaveLength(0);
  });

  it('ANGREP: kan ikke SKRIVE inn i en annen tenant (WITH CHECK)', async () => {
    await expect(
      withTenant(app, tenantA, (tx) =>
        tx.insert(schema.tenantModules).values({ tenantId: tenantB, moduleKey: 'stolen' }),
      ),
    ).rejects.toThrow();
  });

  it('ANGREP: uten tenant-kontekst er alt usynlig (default deny)', async () => {
    const result = await app.execute(sql`select * from tenant_modules`);
    expect(result.rowCount).toBe(0);
  });

  /**
   * VIKTIG FUNN (F1-08): Postgres kaster IKKE feil når en UPDATE/DELETE mangler
   * policy — raden blir bare usynlig for kommandoen, og du får `0 rows affected`.
   * Tukling med audit-loggen feiler altså STILLE. Applikasjonskode kan derfor
   * aldri stole på et unntak her; garantien er at raden er uendret.
   */
  it('audit-loggen er append-only: UPDATE endrer ingenting', async () => {
    const id = randomUUID();
    await withTenant(app, tenantA, (tx) =>
      tx.insert(schema.auditLog).values({
        id,
        tenantId: tenantA,
        actor: 'system',
        action: 'test.event',
        subjectType: 'test',
      }),
    );

    const updated = await withTenant(app, tenantA, (tx) =>
      tx.execute(sql`update audit_log set action = 'tampered' where id = ${id}`),
    );
    expect(updated.rowCount).toBe(0);

    const after = await owner.execute(sql`select action from audit_log where id = ${id}`);
    expect(after.rows[0]).toMatchObject({ action: 'test.event' });
  });

  it('audit-loggen er append-only: DELETE sletter ingenting', async () => {
    const id = randomUUID();
    await withTenant(app, tenantA, (tx) =>
      tx.insert(schema.auditLog).values({
        id,
        tenantId: tenantA,
        actor: 'system',
        action: 'test.event2',
        subjectType: 'test',
      }),
    );

    const deleted = await withTenant(app, tenantA, (tx) =>
      tx.execute(sql`delete from audit_log where id = ${id}`),
    );
    expect(deleted.rowCount).toBe(0);

    const after = await owner.execute(sql`select id from audit_log where id = ${id}`);
    expect(after.rowCount).toBe(1);
  });
});
