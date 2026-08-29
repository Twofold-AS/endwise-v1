import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb, type Database, schema, sql } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appRouter } from '../src/trpc/router.ts';

/**
 * F1-14-hull: team.setFunction skrev bare member_profiles.job_function.
 * Jobbpickeren leser mechanics.list + mechanics.match (active=true).
 * Flip selger → mekaniker ga landing /min-dag, men ingen tildelbar rad.
 */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL ?? OWNER_URL;
const describeDb = OWNER_URL ? describe : describe.skip;

const her = dirname(fileURLToPath(import.meta.url));

function lesBackfillSql(): string {
  return readFileSync(
    resolve(her, '../../../packages/db/drizzle/0032_mekaniker_rad_backfill.sql'),
    'utf8',
  );
}

describeDb('F1-14 — setFunction synker mechanics-rad', () => {
  let owner: Database;
  let app: Database;
  const tenant = randomUUID();
  const annenTenant = randomUUID();
  const LEDER = `sf-leder-${tenant.slice(0, 8)}`;
  const SELGER = `sf-selger-${tenant.slice(0, 8)}`;
  const HULL = `sf-hull-${tenant.slice(0, 8)}`;
  const NABO = `sf-nabo-${annenTenant.slice(0, 8)}`;

  const ctx = (userId: string, role: string, tenantId = tenant) =>
    ({
      db: app,
      events: { publish: async () => {} } as never,
      tenantId,
      userId,
      role,
    }) as never;

  async function matchFor(userId: string, tenantId = tenant) {
    const api = appRouter.createCaller(ctx(userId, 'dealer_admin', tenantId));
    const fra = new Date('2026-09-01T09:00:00Z');
    const til = new Date('2026-09-01T10:00:00Z');
    return api.mechanics.match({
      serviceId: randomUUID(),
      requiredSkills: [],
      from: fra,
      to: til,
    });
  }

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);

    await owner.insert(schema.tenants).values([
      { id: tenant, name: 'SetFunction-test', slug: `sf-${tenant.slice(0, 8)}` },
      { id: annenTenant, name: 'Nabo-setFunction', slug: `sfn-${annenTenant.slice(0, 8)}` },
    ]);
    await owner.insert(schema.organization).values([
      {
        id: tenant,
        name: 'SetFunction-test',
        slug: `sf-org-${tenant.slice(0, 8)}`,
        createdAt: new Date(),
      },
      {
        id: annenTenant,
        name: 'Nabo-setFunction',
        slug: `sfn-org-${annenTenant.slice(0, 8)}`,
        createdAt: new Date(),
      },
    ]);
    await owner.insert(schema.user).values([
      { id: LEDER, name: 'Leder SF', email: `${LEDER}@test.invalid`, emailVerified: true },
      { id: SELGER, name: 'Selger SF', email: `${SELGER}@test.invalid`, emailVerified: true },
      { id: HULL, name: 'Hull SF', email: `${HULL}@test.invalid`, emailVerified: true },
      { id: NABO, name: 'Nabo SF', email: `${NABO}@test.invalid`, emailVerified: true },
    ]);
    await owner.insert(schema.member).values([
      {
        id: randomUUID(),
        organizationId: tenant,
        userId: LEDER,
        role: 'dealer_admin',
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        organizationId: tenant,
        userId: SELGER,
        role: 'dealer_staff',
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        organizationId: tenant,
        userId: HULL,
        role: 'dealer_staff',
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        organizationId: annenTenant,
        userId: NABO,
        role: 'dealer_staff',
        createdAt: new Date(),
      },
    ]);
    await owner.insert(schema.memberProfiles).values({
      tenantId: tenant,
      userId: HULL,
      jobFunction: 'mekaniker',
    });
    await owner.insert(schema.memberProfiles).values({
      tenantId: annenTenant,
      userId: NABO,
      jobFunction: 'mekaniker',
    });
  });

  afterAll(async () => {
    await owner.delete(schema.memberProfiles).where(sql`tenant_id in (${tenant}, ${annenTenant})`);
    await owner.delete(schema.mechanics).where(sql`tenant_id in (${tenant}, ${annenTenant})`);
    await owner.delete(schema.member).where(sql`organization_id in (${tenant}, ${annenTenant})`);
    await owner.delete(schema.user).where(sql`id in (${LEDER}, ${SELGER}, ${HULL}, ${NABO})`);
    await owner.delete(schema.tenants).where(sql`id in (${tenant}, ${annenTenant})`);
    await owner.delete(schema.organization).where(sql`id in (${tenant}, ${annenTenant})`);
  });

  it('setFunction til mekaniker oppretter aktiv mechanics-rad (samme form som invite)', async () => {
    const api = appRouter.createCaller(ctx(LEDER, 'dealer_admin'));
    await api.team.setFunction({ userId: SELGER, funksjon: 'mekaniker' });

    const [rad] = await owner
      .select({
        userId: schema.mechanics.userId,
        name: schema.mechanics.name,
        active: schema.mechanics.active,
        capacity: schema.mechanics.capacity,
      })
      .from(schema.mechanics)
      .where(andTenantUser(tenant, SELGER));
    expect(rad?.userId).toBe(SELGER);
    expect(rad?.name).toBe('Selger SF');
    expect(rad?.active).toBe(true);
    expect(rad?.capacity).toBe(1);

    const liste = await api.mechanics.list();
    const iListe = liste.find((m) => m.userId === SELGER);
    expect(iListe?.active).toBe(true);

    const treff = await matchFor(LEDER);
    expect(treff.some((t) => t.mechanicId === iListe?.id)).toBe(true);
  });

  it('setFunction bort fra mekaniker deaktiverer — faller ut av list/match, sletter ikke', async () => {
    const api = appRouter.createCaller(ctx(LEDER, 'dealer_admin'));
    await api.team.setFunction({ userId: SELGER, funksjon: 'mekaniker' });
    const [før] = await owner
      .select({ id: schema.mechanics.id })
      .from(schema.mechanics)
      .where(andTenantUser(tenant, SELGER));
    expect(før?.id).toBeTruthy();

    await api.team.setFunction({ userId: SELGER, funksjon: 'selger' });

    const [etter] = await owner
      .select({
        id: schema.mechanics.id,
        active: schema.mechanics.active,
      })
      .from(schema.mechanics)
      .where(andTenantUser(tenant, SELGER));
    expect(etter?.id).toBe(før?.id);
    expect(etter?.active).toBe(false);

    const tildelbare = (await api.mechanics.list()).filter((m) => m.active);
    expect(tildelbare.some((m) => m.userId === SELGER)).toBe(false);

    const treff = await matchFor(LEDER);
    expect(treff.some((t) => t.mechanicId === etter?.id)).toBe(false);
  });

  it('setFunction tilbake til mekaniker aktiverer samme rad', async () => {
    const api = appRouter.createCaller(ctx(LEDER, 'dealer_admin'));
    await api.team.setFunction({ userId: SELGER, funksjon: 'mekaniker' });
    const [før] = await owner
      .select({ id: schema.mechanics.id, active: schema.mechanics.active })
      .from(schema.mechanics)
      .where(andTenantUser(tenant, SELGER));
    await api.team.setFunction({ userId: SELGER, funksjon: 'support' });
    await api.team.setFunction({ userId: SELGER, funksjon: 'mekaniker' });

    const rader = await owner
      .select({ id: schema.mechanics.id, active: schema.mechanics.active })
      .from(schema.mechanics)
      .where(andTenantUser(tenant, SELGER));
    expect(rader).toHaveLength(1);
    expect(rader[0]?.id).toBe(før?.id);
    expect(rader[0]?.active).toBe(true);

    const treff = await matchFor(LEDER);
    expect(treff.some((t) => t.mechanicId === rader[0]?.id)).toBe(true);
  });

  it('backfill lager rad for job_function=mekaniker uten mechanics-rad, og er idempotent', async () => {
    const [før] = await owner
      .select({ id: schema.mechanics.id })
      .from(schema.mechanics)
      .where(andTenantUser(tenant, HULL));
    expect(før).toBeUndefined();

    const tekst = lesBackfillSql();
    await owner.execute(sql.raw(tekst));
    await owner.execute(sql.raw(tekst));

    const rader = await owner
      .select({
        userId: schema.mechanics.userId,
        name: schema.mechanics.name,
        active: schema.mechanics.active,
        tenantId: schema.mechanics.tenantId,
      })
      .from(schema.mechanics)
      .where(andTenantUser(tenant, HULL));
    expect(rader).toHaveLength(1);
    expect(rader[0]?.name).toBe('Hull SF');
    expect(rader[0]?.active).toBe(true);
    expect(rader[0]?.tenantId).toBe(tenant);

    const nabo = await owner
      .select({ userId: schema.mechanics.userId, tenantId: schema.mechanics.tenantId })
      .from(schema.mechanics)
      .where(andTenantUser(annenTenant, NABO));
    expect(nabo).toHaveLength(1);
    expect(nabo[0]?.tenantId).toBe(annenTenant);
  });
});

function andTenantUser(tenantId: string, userId: string) {
  return sql`${schema.mechanics.tenantId} = ${tenantId} and ${schema.mechanics.userId} = ${userId}`;
}
