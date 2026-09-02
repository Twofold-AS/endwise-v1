import { createHash, randomUUID } from 'node:crypto';
import { createDb, type Database, eq, schema, sql } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appRouter } from '../src/trpc/router.ts';

/**
 * Team-detalj: jobber, e-post, passordreset, 2FA-av med kode, slett.
 * Sperren er adminProcedure — dealer_staff skal ikke slå av andres 2FA.
 */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('Team-detalj — adminhandlinger', () => {
  let owner: Database;
  let app: Database;
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const LEDER = `tl-${tenantA.slice(0, 8)}`;
  const ANSATT = `ta-${tenantA.slice(0, 8)}`;
  const NABO = `tb-${tenantB.slice(0, 8)}`;
  const opprettet: string[] = [];

  const ctx = (userId: string, role: string, tenantId = tenantA) =>
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
      { id: tenantA, name: 'Team detalj A', slug: `tda-${tenantA.slice(0, 8)}` },
      { id: tenantB, name: 'Team detalj B', slug: `tdb-${tenantB.slice(0, 8)}` },
    ]);
    await owner.insert(schema.organization).values([
      {
        id: tenantA,
        name: 'Team detalj A',
        slug: `tda-org-${tenantA.slice(0, 8)}`,
        createdAt: new Date(),
      },
      {
        id: tenantB,
        name: 'Team detalj B',
        slug: `tdb-org-${tenantB.slice(0, 8)}`,
        createdAt: new Date(),
      },
    ]);
    await owner.insert(schema.user).values([
      {
        id: LEDER,
        name: 'Leder',
        email: `${LEDER}@test.invalid`,
        emailVerified: true,
        twoFactorEnabled: true,
      },
      {
        id: ANSATT,
        name: 'Kari Mek',
        email: `${ANSATT}@test.invalid`,
        emailVerified: true,
        twoFactorEnabled: true,
      },
      {
        id: NABO,
        name: 'Nabo',
        email: `${NABO}@test.invalid`,
        emailVerified: true,
        twoFactorEnabled: true,
      },
    ]);
    await owner.insert(schema.member).values([
      {
        id: randomUUID(),
        organizationId: tenantA,
        userId: LEDER,
        role: 'dealer_admin',
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        organizationId: tenantA,
        userId: ANSATT,
        role: 'dealer_staff',
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        organizationId: tenantB,
        userId: NABO,
        role: 'dealer_admin',
        createdAt: new Date(),
      },
    ]);
    await owner.insert(schema.memberProfiles).values({
      tenantId: tenantA,
      userId: ANSATT,
      jobFunction: 'mekaniker',
    });
    await owner.insert(schema.mechanics).values({
      tenantId: tenantA,
      userId: ANSATT,
      name: 'Kari Mek',
      capacity: 2,
    });
    await owner.insert(schema.account).values({
      id: randomUUID(),
      accountId: ANSATT,
      providerId: 'credential',
      userId: ANSATT,
      password: 'x',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await owner.insert(schema.twoFactor).values({
      id: randomUUID(),
      secret: 'hemmelig',
      backupCodes: '[]',
      userId: ANSATT,
    });
  });

  afterAll(async () => {
    await owner.delete(schema.verification).where(sql`identifier like ${`team-2fa:${tenantA}%`}`);
    await owner.delete(schema.memberProfiles).where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await owner.delete(schema.mechanics).where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await owner.delete(schema.member).where(sql`organization_id in (${tenantA}, ${tenantB})`);
    await owner.delete(schema.twoFactor).where(sql`user_id in (${LEDER}, ${ANSATT}, ${NABO})`);
    await owner.delete(schema.account).where(eq(schema.account.userId, ANSATT));
    if (opprettet.length > 0) {
      await owner.delete(schema.user).where(sql`id = any(${opprettet})`);
    }
    await owner.delete(schema.user).where(sql`id in (${LEDER}, ${ANSATT}, ${NABO})`);
    await owner.delete(schema.tenants).where(sql`id in (${tenantA}, ${tenantB})`);
    await owner.delete(schema.organization).where(sql`id in (${tenantA}, ${tenantB})`);
  });

  it('liste har twoFactorEnabled og mechanicId fra eksisterende kolonner', async () => {
    const api = appRouter.createCaller(ctx(LEDER, 'dealer_admin'));
    const liste = await api.team.list();
    const rad = liste.find((r) => r.userId === ANSATT);
    expect(rad?.twoFactorEnabled).toBe(true);
    expect(rad?.mechanicId).toBeTruthy();
    expect(rad?.funksjon).toBe('mekaniker');
  });

  it('jobber returnerer ærlig tom liste når mekanikeren ikke har saker', async () => {
    const api = appRouter.createCaller(ctx(LEDER, 'dealer_admin'));
    const jobber = await api.team.jobber({ userId: ANSATT });
    expect(jobber).toEqual([]);
  });

  it('⛔ dealer_staff kan ikke lese jobber, endre e-post, sende passord, slå av 2FA eller slette', async () => {
    const api = appRouter.createCaller(ctx(ANSATT, 'dealer_staff'));
    await expect(api.team.jobber({ userId: LEDER })).rejects.toThrow(
      /dealer_staff|FORBIDDEN|kan ikke/i,
    );
    await expect(
      api.team.endreEpost({ userId: LEDER, epost: 'x@test.invalid', totp: '123456' }),
    ).rejects.toThrow(/dealer_staff|FORBIDDEN|kan ikke/i);
    await expect(api.team.sendPassordendring({ userId: LEDER })).rejects.toThrow(
      /dealer_staff|FORBIDDEN|kan ikke/i,
    );
    await expect(api.team.slaAv2faStart({ userId: LEDER })).rejects.toThrow(
      /dealer_staff|FORBIDDEN|kan ikke/i,
    );
    await expect(api.team.slaAv2fa({ userId: LEDER, totp: '123456' })).rejects.toThrow(
      /dealer_staff|FORBIDDEN|kan ikke/i,
    );
    await expect(api.team.fjern({ userId: LEDER })).rejects.toThrow(
      /dealer_staff|FORBIDDEN|kan ikke/i,
    );
  });

  it('⛔ leder kan ikke endre e-post uten fersk TOTP', async () => {
    const api = appRouter.createCaller(ctx(LEDER, 'dealer_admin'));
    const ny = `kari-${tenantA.slice(0, 8)}@verksted.test`;
    await expect(
      api.team.endreEpost({ userId: ANSATT, epost: ny, totp: '000000' }),
    ).rejects.toThrow(/fersk kode|FORBIDDEN|TOTP/i);
    const [rad] = await owner
      .select({ id: schema.user.id, email: schema.user.email })
      .from(schema.user)
      .where(eq(schema.user.id, ANSATT));
    expect(rad?.email).toBe(`${ANSATT}@test.invalid`);
  });

  it('⛔ leder i tenant B kan ikke endre e-post i tenant A', async () => {
    const api = appRouter.createCaller(ctx(NABO, 'dealer_admin', tenantB));
    await expect(
      api.team.endreEpost({ userId: ANSATT, epost: 'stjelt@test.invalid', totp: '123456' }),
    ).rejects.toThrow(/ikke medlem|NOT_FOUND|finner ikke/i);
  });

  it('2FA-av uten fersk TOTP avvises — e-postkode teller ikke', async () => {
    const api = appRouter.createCaller(ctx(LEDER, 'dealer_admin'));
    await expect(api.team.slaAv2fa({ userId: ANSATT, totp: '000000' })).rejects.toThrow(
      /fersk kode|FORBIDDEN|TOTP/i,
    );

    const start = await api.team.slaAv2faStart({ userId: ANSATT });
    expect(start.kreverTotp).toBe(true);
    await expect(api.team.slaAv2fa({ userId: ANSATT, totp: '000000' })).rejects.toThrow(
      /fersk kode|FORBIDDEN|TOTP/i,
    );

    const [etterFeil] = await owner
      .select({ on: schema.user.twoFactorEnabled })
      .from(schema.user)
      .where(eq(schema.user.id, ANSATT));
    expect(etterFeil?.on).toBe(true);
  });

  it('hash av bekreftelseskode er SHA-256, aldri åpen tekst', () => {
    expect(hashTeamBekreftelse('654321')).toBe(
      createHash('sha256').update('654321', 'utf8').digest('hex'),
    );
    expect(hashTeamBekreftelse('654321')).not.toBe('654321');
  });

  it('send passordendring krever at personen har ekte e-post', async () => {
    const api = appRouter.createCaller(ctx(LEDER, 'dealer_admin'));
    const lokal = await api.team.opprettUtenInvitasjon({
      navn: 'Uten mail',
      funksjon: 'selger',
    });
    opprettet.push(lokal.userId);
    await expect(api.team.sendPassordendring({ userId: lokal.userId })).rejects.toThrow(
      /e-post|innlogging/i,
    );
  });

  it('fjern deaktiverer mekaniker og fjerner medlemskap — sletter ikke brukeren', async () => {
    const api = appRouter.createCaller(ctx(LEDER, 'dealer_admin'));
    const lokal = await api.team.opprettUtenInvitasjon({
      navn: 'Skal ut',
      funksjon: 'mekaniker',
    });
    opprettet.push(lokal.userId);

    const res = await api.team.fjern({ userId: lokal.userId });
    expect(res.deaktivert).toBe(true);

    const [bruker] = await owner
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.id, lokal.userId));
    expect(bruker?.id).toBe(lokal.userId);

    const [medlem] = await owner
      .select({ id: schema.member.id })
      .from(schema.member)
      .where(eq(schema.member.userId, lokal.userId));
    expect(medlem).toBeUndefined();

    const [mek] = await owner
      .select({ active: schema.mechanics.active })
      .from(schema.mechanics)
      .where(eq(schema.mechanics.userId, lokal.userId));
    expect(mek?.active).toBe(false);
  });
});
