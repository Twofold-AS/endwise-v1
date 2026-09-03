import { randomUUID } from 'node:crypto';
import { createDb, type Database, eq, schema } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTenantShell } from '../src/tenant.ts';

/**
 * Ghost-slug: createTenantShell committer organization før eier-invite.
 * Hvis invite-INSERT kaster, må org-raden rulles tilbake — ellers er
 * slug opptatt og forhandlerlista tom.
 */
const OWNER_URL = process.env.DATABASE_URL;
const describeDb = OWNER_URL ? describe : describe.skip;

describeDb('createTenantShell ruller tilbake org når etter-insert kaster', () => {
  let db: Database;
  const slug = `ghost-${randomUUID().slice(0, 8)}`;

  beforeAll(() => {
    db = createDb(OWNER_URL as string);
  });

  afterAll(async () => {
    await db.delete(schema.tenantModules).where(eq(schema.tenantModules.plan, slug));
    await db.delete(schema.organization).where(eq(schema.organization.slug, slug));
    await db.delete(schema.tenants).where(eq(schema.tenants.slug, slug));
  });

  it('organization-slug er ledig etter at inTx kaster', async () => {
    await expect(
      createTenantShell(db, { name: 'Ghost AS', slug, kind: 'demo', plan: 'start' }, async () => {
        throw new Error('invite feilet');
      }),
    ).rejects.toThrow('invite feilet');

    const [org] = await db
      .select({ id: schema.organization.id })
      .from(schema.organization)
      .where(eq(schema.organization.slug, slug));
    expect(org).toBeUndefined();

    const [tenant] = await db
      .select({ id: schema.tenants.id })
      .from(schema.tenants)
      .where(eq(schema.tenants.slug, slug));
    expect(tenant).toBeUndefined();
  });
});
