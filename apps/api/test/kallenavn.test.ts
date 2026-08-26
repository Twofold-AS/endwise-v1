import { randomUUID } from 'node:crypto';
import { createDb, type Database, eq, schema, sql } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appRouter } from '../src/trpc/router.ts';

/**
 * F7-06 / F5-19 — kallenavn på `member_profiles.nickname`.
 *
 * Mikael 26.08.2026: feltet skal LAGRE for alle roller, inkludert
 * dealer_staff (ikke-admin). Dette er CWE-862-motsatsen: gaten skal
 * slippe inn, ikke stenge, og lesingen skal treffe samme kolonne.
 */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('kallenavn — lagre og les for dealer_staff', () => {
  let owner: Database;
  let app: Database;
  const tenant = randomUUID();
  const ansatt = `kn-staff-${randomUUID()}`;

  const ctx = () =>
    ({
      db: app,
      events: { publish: async () => {} } as never,
      tenantId: tenant,
      userId: ansatt,
      role: 'dealer_staff' as const,
    }) as never;

  const somAnsatt = () => appRouter.createCaller(ctx());

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);
    await owner.insert(schema.tenants).values({
      id: tenant,
      name: 'Kallenavn-test',
      slug: `kn-${tenant.slice(0, 8)}`,
    });
    await owner.insert(schema.organization).values({
      id: tenant,
      name: 'Kallenavn-test',
      slug: `kn-org-${tenant.slice(0, 8)}`,
      createdAt: new Date(),
    });
    await owner.insert(schema.user).values({
      id: ansatt,
      name: 'Ola Staff',
      email: `${ansatt}@test.no`,
      emailVerified: true,
    });
    await owner.insert(schema.member).values({
      id: randomUUID(),
      organizationId: tenant,
      userId: ansatt,
      role: 'member',
      createdAt: new Date(),
    });
  });

  afterAll(async () => {
    await owner
      .delete(schema.memberProfiles)
      .where(sql`user_id = ${ansatt}`)
      .catch(() => {});
    await owner.delete(schema.member).where(eq(schema.member.userId, ansatt));
    await owner.delete(schema.user).where(eq(schema.user.id, ansatt));
    await owner.delete(schema.organization).where(eq(schema.organization.id, tenant));
    await owner.delete(schema.tenants).where(eq(schema.tenants.id, tenant));
  });

  it('dealer_staff kan sette og lese kallenavn på member_profiles.nickname', async () => {
    const lagret = await somAnsatt().profile.setNickname({ kallenavn: 'Skiftenøkkelen' });
    expect(lagret.kallenavn).toBe('Skiftenøkkelen');

    const meg = await somAnsatt().profile.meg();
    expect(meg.kallenavn).toBe('Skiftenøkkelen');
    expect(meg.kanHaKallenavn).toBe(true);

    const megSesjon = await somAnsatt().session.me();
    expect(megSesjon.kallenavn).toBe('Skiftenøkkelen');
    expect(megSesjon.internNavn).toBe('Skiftenøkkelen');
    expect(megSesjon.navn).toBe('Ola Staff');
  });
});
