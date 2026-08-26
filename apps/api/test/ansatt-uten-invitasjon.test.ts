import { randomUUID } from 'node:crypto';
import { createDb, type Database, eq, schema, sql } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appRouter } from '../src/trpc/router.ts';

/**
 * F1-10 tillegg — opprett ansatt uten å sende invitasjons-e-post.
 * Hypotesen holdt: `invitasjoner.opprett` sender alltid (eller forsøker).
 * Denne ruta lager medlemskap + funksjon uten invitations-rad og uten
 * credential-konto. Invitasjonsstien er urørt.
 */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('F1-10 — ansatt uten invitasjon', () => {
  let owner: Database;
  let app: Database;
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const LEDER = `leder-${tenantA.slice(0, 8)}`;
  const ANSATT = `ansatt-${tenantA.slice(0, 8)}`;
  const opprettetBrukere: string[] = [];

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
      { id: tenantA, name: 'Lokalt team', slug: `lt-${tenantA.slice(0, 8)}` },
      { id: tenantB, name: 'Naboen', slug: `nb-${tenantB.slice(0, 8)}` },
    ]);
    await owner.insert(schema.organization).values([
      {
        id: tenantA,
        name: 'Lokalt team',
        slug: `lt-org-${tenantA.slice(0, 8)}`,
        createdAt: new Date(),
      },
      {
        id: tenantB,
        name: 'Naboen',
        slug: `nb-org-${tenantB.slice(0, 8)}`,
        createdAt: new Date(),
      },
    ]);
    await owner.insert(schema.user).values([
      { id: LEDER, name: 'Leder', email: `${LEDER}@test.invalid`, emailVerified: true },
      { id: ANSATT, name: 'Ansatt', email: `${ANSATT}@test.invalid`, emailVerified: true },
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
    ]);
  });

  afterAll(async () => {
    await owner.delete(schema.invitations).where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await owner.delete(schema.memberProfiles).where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await owner.delete(schema.mechanics).where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await owner.delete(schema.member).where(sql`organization_id in (${tenantA}, ${tenantB})`);
    if (opprettetBrukere.length > 0) {
      await owner.delete(schema.user).where(sql`id = any(${opprettetBrukere})`);
    }
    await owner.delete(schema.user).where(sql`id in (${LEDER}, ${ANSATT})`);
    await owner.delete(schema.tenants).where(sql`id in (${tenantA}, ${tenantB})`);
    await owner.delete(schema.organization).where(sql`id in (${tenantA}, ${tenantB})`);
  });

  it('leder kan legge til mekaniker uten e-post — ingen invitasjon, ingen innlogging', async () => {
    const api = appRouter.createCaller(ctx(LEDER, 'dealer_admin'));
    const res = await api.team.opprettUtenInvitasjon({
      navn: 'Per Tang',
      funksjon: 'mekaniker',
    });
    opprettetBrukere.push(res.userId);

    expect(res.kanLoggeInn).toBe(false);
    expect(res.funksjon).toBe('mekaniker');
    expect(res.epost).toBe('');

    const [inv] = await owner
      .select({ id: schema.invitations.id })
      .from(schema.invitations)
      .where(eq(schema.invitations.tenantId, tenantA));
    expect(inv).toBeUndefined();

    const [konto] = await owner
      .select({ id: schema.account.id })
      .from(schema.account)
      .where(eq(schema.account.userId, res.userId));
    expect(konto).toBeUndefined();

    const [mek] = await owner
      .select({ name: schema.mechanics.name, userId: schema.mechanics.userId })
      .from(schema.mechanics)
      .where(eq(schema.mechanics.userId, res.userId));
    expect(mek?.name).toBe('Per Tang');

    const liste = await api.team.list();
    const rad = liste.find((r) => r.userId === res.userId);
    expect(rad?.funksjon).toBe('mekaniker');
    expect(rad?.kanLoggeInn).toBe(false);
    expect(rad?.harMekanikerprofil).toBe(true);
    expect(rad?.rolle).toBe('dealer_staff');
  });

  it('selger og support lander i teamet uten mekanikerprofil', async () => {
    const api = appRouter.createCaller(ctx(LEDER, 'dealer_admin'));
    const selger = await api.team.opprettUtenInvitasjon({
      navn: 'Siri Selger',
      epost: `siri-${tenantA.slice(0, 8)}@verksted.test`,
      funksjon: 'selger',
    });
    const support = await api.team.opprettUtenInvitasjon({
      navn: 'Tom Support',
      funksjon: 'support',
    });
    opprettetBrukere.push(selger.userId, support.userId);

    const [mekSelger] = await owner
      .select({ id: schema.mechanics.id })
      .from(schema.mechanics)
      .where(eq(schema.mechanics.userId, selger.userId));
    expect(mekSelger).toBeUndefined();

    const liste = await api.team.list();
    expect(liste.find((r) => r.userId === selger.userId)?.funksjon).toBe('selger');
    expect(liste.find((r) => r.userId === support.userId)?.funksjon).toBe('support');
    expect(liste.find((r) => r.userId === selger.userId)?.epost).toBe(
      `siri-${tenantA.slice(0, 8)}@verksted.test`,
    );
  });

  it('⛔ dealer_staff kan ikke legge til ansatte', async () => {
    const api = appRouter.createCaller(ctx(ANSATT, 'dealer_staff'));
    await expect(
      api.team.opprettUtenInvitasjon({ navn: 'Hack', funksjon: 'selger' }),
    ).rejects.toThrow(/dealer_staff|FORBIDDEN|kan ikke/i);
  });

  it('⛔ eksisterende e-post avvises — invitasjon er stien for innlogging', async () => {
    const api = appRouter.createCaller(ctx(LEDER, 'dealer_admin'));
    await expect(
      api.team.opprettUtenInvitasjon({
        navn: 'Duplikat',
        epost: `${LEDER}@test.invalid`,
        funksjon: 'support',
      }),
    ).rejects.toThrow(/allerede i bruk/i);
  });

  it('invitasjonsstien finnes fortsatt og lager en invitations-rad', async () => {
    const api = appRouter.createCaller(ctx(LEDER, 'dealer_admin'));
    const res = await api.invitasjoner.opprett({
      epost: `ny-${tenantA.slice(0, 8)}@verksted.test`,
      funksjon: 'selger',
    });
    expect(res.epost).toBe(`ny-${tenantA.slice(0, 8)}@verksted.test`);
    const [inv] = await owner
      .select({ email: schema.invitations.email })
      .from(schema.invitations)
      .where(eq(schema.invitations.id, res.id));
    expect(inv?.email).toBe(res.epost);
    await owner.delete(schema.invitations).where(eq(schema.invitations.id, res.id));
  });
});
