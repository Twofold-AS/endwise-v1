import { randomUUID } from 'node:crypto';
import { createDb, type Database, schema, sql } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appRouter } from '../src/trpc/router.ts';

/**
 * F5-14 — Intern-pillen er kontoret, ikke verkstedsgulvet.
 * Isolasjon: organization_id = tenant. Ingen e-post. Mekaniker ute.
 */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('F5-14 — directory.colleagues', () => {
  let owner: Database;
  let app: Database;
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const leder = `col-leder-${tenantA.slice(0, 8)}`;
  const selger = `col-selger-${tenantA.slice(0, 8)}`;
  const mekaniker = `col-mek-${tenantA.slice(0, 8)}`;
  const fremmed = `col-b-${tenantB.slice(0, 8)}`;

  const ctx = (tenantId: string, userId: string, role: 'dealer_admin' | 'dealer_staff') =>
    ({
      db: app,
      events: { publish: async () => {} } as never,
      tenantId,
      userId,
      role,
    }) as never;

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);
    await owner.insert(schema.tenants).values([
      { id: tenantA, name: 'Kollega A', slug: `col-a-${tenantA.slice(0, 8)}` },
      { id: tenantB, name: 'Kollega B', slug: `col-b-${tenantB.slice(0, 8)}` },
    ]);
    await owner.insert(schema.organization).values([
      {
        id: tenantA,
        name: 'Kollega A',
        slug: `col-a-${tenantA.slice(0, 8)}`,
        createdAt: new Date(),
      },
      {
        id: tenantB,
        name: 'Kollega B',
        slug: `col-b-${tenantB.slice(0, 8)}`,
        createdAt: new Date(),
      },
    ]);
    await owner.insert(schema.user).values([
      { id: leder, name: 'Leder A', email: `${leder}@test.no`, emailVerified: true },
      { id: selger, name: 'Selger A', email: `${selger}@test.no`, emailVerified: true },
      { id: mekaniker, name: 'Mek A', email: `${mekaniker}@test.no`, emailVerified: true },
      { id: fremmed, name: 'Leder B', email: `${fremmed}@test.no`, emailVerified: true },
    ]);
    await owner.insert(schema.member).values([
      {
        id: randomUUID(),
        organizationId: tenantA,
        userId: leder,
        role: 'dealer_admin',
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        organizationId: tenantA,
        userId: selger,
        role: 'dealer_staff',
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        organizationId: tenantA,
        userId: mekaniker,
        role: 'dealer_staff',
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        organizationId: tenantB,
        userId: fremmed,
        role: 'dealer_admin',
        createdAt: new Date(),
      },
    ]);
    await owner.insert(schema.mechanics).values({
      tenantId: tenantA,
      userId: mekaniker,
      name: 'Mek A',
    });
  });

  afterAll(async () => {
    await owner.delete(schema.mechanics).where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await owner.delete(schema.member).where(sql`organization_id in (${tenantA}, ${tenantB})`);
    await owner.delete(schema.organization).where(sql`id in (${tenantA}, ${tenantB})`);
    await owner
      .delete(schema.user)
      .where(sql`id in (${leder}, ${selger}, ${mekaniker}, ${fremmed})`);
    await owner.delete(schema.tenants).where(sql`id in (${tenantA}, ${tenantB})`);
  });

  it('lister kontoret (leder/selger) og utelater mekaniker på gulvet', async () => {
    const liste = await appRouter
      .createCaller(ctx(tenantA, leder, 'dealer_admin'))
      .directory.colleagues();
    const ider = liste.map((k) => k.userId);
    expect(ider).toContain(leder);
    expect(ider).toContain(selger);
    expect(ider).not.toContain(mekaniker);
    expect(liste.every((k) => k.funksjon !== 'mekaniker')).toBe(true);
    expect(JSON.stringify(liste)).not.toMatch(/@test\.no/);
  });

  it('⛔ ANGREP: tenant B ser ikke As kollegaer', async () => {
    const liste = await appRouter
      .createCaller(ctx(tenantB, fremmed, 'dealer_admin'))
      .directory.colleagues();
    const ider = liste.map((k) => k.userId);
    expect(ider).toContain(fremmed);
    expect(ider).not.toContain(leder);
    expect(ider).not.toContain(selger);
    expect(ider).not.toContain(mekaniker);
  });
});
