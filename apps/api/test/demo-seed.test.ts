import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb, type Database, eq, schema, sql } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appRouter } from '../src/trpc/router.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('F5-26/F5-27: demo-seed er opt-in, ikke auto på nye forhandlere', () => {
  it('tenants.create kaller ikke seedDemo og skriver ikke demo-kunder', () => {
    const kilde = utenKommentarer(les('../src/trpc/routers/tenants.ts'));
    const createBlokk = kilde.slice(
      kilde.indexOf('create: endwiseAdminProcedure'),
      kilde.indexOf('setModules:'),
    );
    expect(createBlokk).not.toMatch(/seedDemo/);
    expect(createBlokk).not.toMatch(/Demo Demosen|EU-kontroll MC \(demo\)/);
    expect(createBlokk).not.toMatch(/schema\.customers|schema\.services|schema\.parts/);
  });

  it('seedDemo tar valgfri tenantId slik Endwise-admin kan seede en annen demo-tenant', () => {
    const kilde = utenKommentarer(les('../src/trpc/routers/tenants.ts'));
    const seedBlokk = kilde.slice(kilde.indexOf('seedDemo:'));
    expect(seedBlokk).toMatch(/tenantId:\s*z\.uuid\(\)/);
    expect(seedBlokk).toMatch(/kind !== ['"]demo['"]/);
  });

  it('dev-seeden fyller bare Verksted A/B, ikke forhandlere opprettet i admin', () => {
    const seed = utenKommentarer(les('../scripts/seed.ts'));
    expect(seed).toMatch(/verksted-a/);
    expect(seed).toMatch(/verksted-b/);
    expect(seed).not.toMatch(/demo-tenants opprettet fra Endwise-admin/);
    expect(seed).toMatch(/SEED_DEMO_SLUGS|kun kjente seed-tenants/);
  });
});

const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

const ctx = (
  app: Database,
  role: 'endwise_admin' | 'dealer_admin',
  tenantId: string,
  userId: string,
) =>
  ({
    db: app,
    events: { publish: async () => {} } as never,
    tenantId,
    userId,
    role,
  }) as never;

describeDb('F5-27: seedDemo mot valgt demo-tenant fra plattform-sesjon', () => {
  let owner: Database;
  let app: Database;
  const adminTenant = randomUUID();
  const adminUser = `demo-adm-${adminTenant.slice(0, 8)}`;
  const tenantIds: string[] = [];

  const somEndwise = () =>
    appRouter.createCaller(ctx(app, 'endwise_admin', adminTenant, adminUser));

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);
    await owner.insert(schema.tenants).values({
      id: adminTenant,
      name: 'Endwise HQ',
      slug: `ew-hq-${adminTenant.slice(0, 8)}`,
      kind: 'platform',
    });
    await owner.insert(schema.organization).values({
      id: adminTenant,
      name: 'Endwise HQ',
      slug: `ew-hq-${adminTenant.slice(0, 8)}`,
      createdAt: new Date(),
    });
    await owner
      .insert(schema.featureFlags)
      .values({ key: 'dev-mode', enabled: true, description: 'test' })
      .onConflictDoUpdate({
        target: schema.featureFlags.key,
        set: { enabled: true },
      });
  });

  afterAll(async () => {
    for (const id of tenantIds) {
      await owner.delete(schema.mechanics).where(eq(schema.mechanics.tenantId, id));
      await owner.delete(schema.services).where(eq(schema.services.tenantId, id));
      await owner.delete(schema.customers).where(eq(schema.customers.tenantId, id));
      await owner.delete(schema.auditLog).where(sql`tenant_id = ${id}`);
      await owner.delete(schema.invitations).where(eq(schema.invitations.tenantId, id));
      await owner.delete(schema.tenantModules).where(sql`tenant_id = ${id}`);
      await owner.delete(schema.organization).where(sql`id = ${id}`);
      await owner.delete(schema.tenants).where(sql`id = ${id}`);
    }
    await owner.delete(schema.organization).where(eq(schema.organization.id, adminTenant));
    await owner.delete(schema.tenants).where(eq(schema.tenants.id, adminTenant));
  });

  it('create etterlater tom tenant — ingen kunder/tjenester/deler', async () => {
    const slug = `tom-${randomUUID().slice(0, 8)}`;
    const res = await somEndwise().tenants.create({
      name: 'Tom AS',
      slug,
      ownerEmail: `eier.${slug}@verksted.test`,
      kind: 'live',
      tier: 'start',
    });
    tenantIds.push(res.tenantId);

    const kunder = await owner
      .select({ id: schema.customers.id })
      .from(schema.customers)
      .where(eq(schema.customers.tenantId, res.tenantId));
    const tjenester = await owner
      .select({ id: schema.services.id })
      .from(schema.services)
      .where(eq(schema.services.tenantId, res.tenantId));
    const deler = await owner
      .select({ id: schema.parts.id })
      .from(schema.parts)
      .where(eq(schema.parts.tenantId, res.tenantId));
    expect(kunder).toEqual([]);
    expect(tjenester).toEqual([]);
    expect(deler).toEqual([]);
  });

  it('seedDemo({ tenantId }) fyller en demo-tenant selv om sesjonen er i Endwise', async () => {
    const slug = `seed-${randomUUID().slice(0, 8)}`;
    const res = await somEndwise().tenants.create({
      name: 'Demo AS',
      slug,
      ownerEmail: `eier.${slug}@verksted.test`,
      kind: 'demo',
      tier: 'start',
    });
    tenantIds.push(res.tenantId);

    const seeded = await somEndwise().tenants.seedDemo({ tenantId: res.tenantId });
    expect(seeded.customerId).toBeTruthy();
    expect(seeded.serviceId).toBeTruthy();

    const [kunde] = await owner
      .select({ name: schema.customers.name })
      .from(schema.customers)
      .where(eq(schema.customers.tenantId, res.tenantId));
    expect(kunde?.name).toBe('Demo Demosen');
  });

  it('seedDemo nekter live-tenant', async () => {
    const slug = `live-${randomUUID().slice(0, 8)}`;
    const res = await somEndwise().tenants.create({
      name: 'Live AS',
      slug,
      ownerEmail: `eier.${slug}@verksted.test`,
      kind: 'live',
      tier: 'start',
    });
    tenantIds.push(res.tenantId);

    await expect(somEndwise().tenants.seedDemo({ tenantId: res.tenantId })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
});
