import { randomUUID } from 'node:crypto';
import { createDb, type Database, eq, schema, sql } from '@endwise/db';
import { ADDON_MODULES, BASIS_MODULES } from '@endwise/modules';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { handleHono } from '../src/http/hono.ts';
import { invitasjon } from '../src/routes/invitasjon.ts';
import { appRouter } from '../src/trpc/router.ts';

/**
 * F5-26 — INVITE-ONLY FORHANDLER-ONBOARDING.
 *
 *  · manglende bruker + create → tenant + eier-invite, ingen bruker ennå
 *  · godta setter passord og dealer_admin
 *  · dealer_admin kan ikke tildele egne moduler
 *  · staff-invite kan fortsatt ikke bli dealer_admin
 */
async function forventer(kall: Promise<unknown>, code: 'FORBIDDEN' | 'NOT_FOUND' | 'BAD_REQUEST') {
  await expect(kall).rejects.toMatchObject({ code });
}

const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

const ctx = (
  app: Database,
  role: 'endwise_admin' | 'dealer_admin' | 'dealer_staff',
  tenantId: string,
  userId = `eier-${role}-${tenantId.slice(0, 8)}`,
) =>
  ({
    db: app,
    events: { publish: async () => {} } as never,
    tenantId,
    userId,
    role,
  }) as never;

describe('F5-26 — START_MODULER og katalog', () => {
  it('START_MODULER er tom — basis er ikke valgfritt', async () => {
    const kilde = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('../src/trpc/routers/tenants.ts', import.meta.url), 'utf8'),
    );
    expect(kilde).toMatch(/const START_MODULER: string\[\] = \[\]/);
    for (const b of BASIS_MODULES) {
      expect(ADDON_MODULES).not.toContain(b);
    }
  });
});

describe('F5-26 — dealer kan ikke tildele egne moduler', () => {
  it('⛔ ANGREP: dealer_admin får FORBIDDEN på setModules', async () => {
    await forventer(
      appRouter
        .createCaller(ctx({} as never, 'dealer_admin', '00000000-0000-0000-0000-000000000001'))
        .tenants.setModules({
          tenantId: '00000000-0000-0000-0000-000000000001',
          modules: ['quick'],
        }),
      'FORBIDDEN',
    );
  });

  it('⛔ ANGREP: dealer_admin får FORBIDDEN på create', async () => {
    await forventer(
      appRouter
        .createCaller(ctx({} as never, 'dealer_admin', '00000000-0000-0000-0000-000000000001'))
        .tenants.create({
          name: 'Ulovlig AS',
          slug: 'ulovlig-as',
          ownerEmail: 'tyv@x.no',
          modules: ['ai-support'],
        }),
      'FORBIDDEN',
    );
  });
});

describe('F5-26 — shop og twilio kan ikke tildeles', () => {
  const admin = () =>
    appRouter.createCaller(
      ctx({} as never, 'endwise_admin', '00000000-0000-0000-0000-000000000001'),
    );

  it('create avviser shop', async () => {
    await forventer(
      admin().tenants.create({
        name: 'Shop nei',
        slug: 'shop-nei',
        ownerEmail: 'shop@x.no',
        modules: ['shop'],
      }),
      'BAD_REQUEST',
    );
  });

  it('create avviser twilio (SMS er ikke et tillegg)', async () => {
    await forventer(
      admin().tenants.create({
        name: 'Sms nei',
        slug: 'sms-nei',
        ownerEmail: 'sms@x.no',
        modules: ['twilio'],
      }),
      'BAD_REQUEST',
    );
  });

  it('create.optional avviser shop og twilio', async () => {
    await forventer(
      admin().tenants.create({
        name: 'Opt shop',
        slug: 'opt-shop',
        ownerEmail: 'opt@x.no',
        optional: ['shop'],
      }),
      'BAD_REQUEST',
    );
    await forventer(
      admin().tenants.create({
        name: 'Opt sms',
        slug: 'opt-sms',
        ownerEmail: 'optsms@x.no',
        optional: ['twilio'],
      }),
      'BAD_REQUEST',
    );
  });

  it('onboarding.fullfor avviser shop/twilio i extras', async () => {
    const eier = appRouter.createCaller(
      ctx({} as never, 'dealer_admin', '00000000-0000-0000-0000-000000000001'),
    );
    await forventer(
      eier.onboarding.fullfor({ visningsnavn: 'Test AS', extras: ['shop'] }),
      'BAD_REQUEST',
    );
    await forventer(
      eier.onboarding.fullfor({ visningsnavn: 'Test AS', extras: ['twilio'] }),
      'BAD_REQUEST',
    );
  });

  it('setModules avviser shop og twilio', async () => {
    await forventer(
      admin().tenants.setModules({
        tenantId: '00000000-0000-0000-0000-000000000001',
        modules: ['shop'],
      }),
      'BAD_REQUEST',
    );
    await forventer(
      admin().tenants.setModules({
        tenantId: '00000000-0000-0000-0000-000000000001',
        modules: ['twilio'],
      }),
      'BAD_REQUEST',
    );
  });
});

describeDb('F5-26 — eier-invitasjon mot Postgres', () => {
  let owner: Database;
  let app: Database;
  const adminTenant = randomUUID();
  const adminUser = `ew-adm-${adminTenant.slice(0, 8)}`;
  const slugs: string[] = [];
  const tenantIds: string[] = [];
  const userIds: string[] = [];

  const somEndwise = () =>
    appRouter.createCaller(ctx(app, 'endwise_admin', adminTenant, adminUser));

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);
    await owner.insert(schema.tenants).values({
      id: adminTenant,
      name: 'Endwise HQ',
      slug: `ew-hq-${adminTenant.slice(0, 8)}`,
    });
    await owner.insert(schema.organization).values({
      id: adminTenant,
      name: 'Endwise HQ',
      slug: `ew-hq-${adminTenant.slice(0, 8)}`,
      createdAt: new Date(),
    });
  });

  afterAll(async () => {
    for (const id of tenantIds) {
      await owner.delete(schema.auditLog).where(sql`tenant_id = ${id}`);
      await owner.delete(schema.invitations).where(eq(schema.invitations.tenantId, id));
      await owner.delete(schema.memberProfiles).where(sql`tenant_id = ${id}`);
      await owner.delete(schema.tenantModules).where(sql`tenant_id = ${id}`);
      await owner.delete(schema.member).where(sql`organization_id = ${id}`);
      await owner.delete(schema.organization).where(sql`id = ${id}`);
      await owner.delete(schema.tenants).where(sql`id = ${id}`);
    }
    for (const id of userIds) {
      await owner.delete(schema.account).where(eq(schema.account.userId, id));
      await owner.delete(schema.session).where(eq(schema.session.userId, id));
      await owner.delete(schema.user).where(eq(schema.user.id, id));
    }
    await owner.delete(schema.organization).where(eq(schema.organization.id, adminTenant));
    await owner.delete(schema.tenants).where(eq(schema.tenants.id, adminTenant));
  });

  it('manglende bruker + invite oppretter tenant uten å lage konto', async () => {
    const slug = `ny-eier-${randomUUID().slice(0, 8)}`;
    slugs.push(slug);
    const epost = `ny.${slug}@verksted.test`;
    const res = await somEndwise().tenants.create({
      name: 'Ny eier AS',
      slug,
      ownerEmail: epost,
      kind: 'demo',
      modules: ['quick', 'vegvesen', 'ai-support'],
      optional: ['white-label'],
    });
    tenantIds.push(res.tenantId);

    expect(res.existingUser).toBe(false);
    expect(res.invite.epost).toBe(epost);
    expect(res.invite.id).toBeTruthy();

    const [bruker] = await owner
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, epost));
    expect(bruker).toBeUndefined();

    const [medlem] = await owner
      .select({ id: schema.member.id })
      .from(schema.member)
      .where(eq(schema.member.organizationId, res.tenantId));
    expect(medlem).toBeUndefined();

    const mods = await owner
      .select({ key: schema.tenantModules.moduleKey, enabled: schema.tenantModules.enabled })
      .from(schema.tenantModules)
      .where(eq(schema.tenantModules.tenantId, res.tenantId));
    expect(
      mods
        .filter((m) => m.enabled)
        .map((m) => m.key)
        .sort(),
    ).toEqual(['ai-support', 'quick', 'vegvesen']);
    expect(mods.find((m) => m.key === 'white-label')?.enabled).toBe(false);

    const [tenant] = await owner
      .select({ ferdig: schema.tenants.onboardingCompletedAt })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, res.tenantId));
    expect(tenant?.ferdig).toBeNull();

    const audit = await owner
      .select({ action: schema.auditLog.action })
      .from(schema.auditLog)
      .where(eq(schema.auditLog.tenantId, res.tenantId));
    expect(audit.some((a) => a.action === 'tenant.created')).toBe(true);
    expect(audit.filter((a) => a.action === 'entitlement.granted')).toHaveLength(3);
  });

  it('avviser basis-moduler på create', async () => {
    await forventer(
      somEndwise().tenants.create({
        name: 'Basis nei',
        slug: `basis-${randomUUID().slice(0, 8)}`,
        ownerEmail: 'basis@x.no',
        modules: ['booking'],
      }),
      'BAD_REQUEST',
    );
  });

  it('godta på eier-invite setter passord og dealer_admin', async () => {
    const slug = `godta-${randomUUID().slice(0, 8)}`;
    slugs.push(slug);
    const epost = `godta.${slug}@verksted.test`;
    const opprettet = await somEndwise().tenants.create({
      name: 'Godta AS',
      slug,
      ownerEmail: epost,
      kind: 'demo',
      modules: ['vegvesen'],
    });
    tenantIds.push(opprettet.tenantId);

    const [rad] = await owner
      .select({ hash: schema.invitations.tokenHash, kind: schema.invitations.kind })
      .from(schema.invitations)
      .where(eq(schema.invitations.id, opprettet.invite.id));
    expect(rad?.kind).toBe('owner');

    const { hashInvitasjonstoken } = await import('@endwise/modules/invitasjoner');
    // Tokenet er ikke i basen. Vi lager en NY invite vi kjenner tokenet til.
    const { createInvitasjonsmodul } = await import('@endwise/modules/invitasjoner');
    const modul = createInvitasjonsmodul(owner);
    await modul.tilbakekallApneEier(opprettet.tenantId, epost);
    const { token } = await modul.opprettEier({
      tenantId: opprettet.tenantId,
      epost,
      invitedBy: adminUser,
    });
    expect(hashInvitasjonstoken(token)).not.toBe(token);

    const peek = await invitasjon.request(`/${token}`);
    expect(peek.status).toBe(200);
    const peekBody = (await peek.json()) as { kreverPassord: boolean; kind: string };
    expect(peekBody.kind).toBe('owner');
    expect(peekBody.kreverPassord).toBe(true);

    // Samme sti som siden (`/invitasjoner/:token`), ikke sub-appen på `/:token`.
    const viaSide = await handleHono(
      new Request(`http://endwise.test/invitasjoner/${encodeURIComponent(token)}`),
    );
    expect(viaSide.status).toBe(200);
    expect(await viaSide.json()).toMatchObject({ gyldig: true, kind: 'owner' });

    const passord = 'eier-passord-12';
    const godta = await invitasjon.request('/godta', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, navn: 'Kari Eier', passord }),
    });
    const body = (await godta.json()) as { ok?: boolean; error?: string; nyKonto?: boolean };
    expect(godta.status, body.error).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.nyKonto).toBe(true);

    const [bruker] = await owner
      .select({ id: schema.user.id, name: schema.user.name })
      .from(schema.user)
      .where(eq(schema.user.email, epost));
    expect(bruker?.name).toBe('Kari Eier');
    if (bruker) userIds.push(bruker.id);

    const [medlem] = await owner
      .select({ role: schema.member.role })
      .from(schema.member)
      .where(eq(schema.member.organizationId, opprettet.tenantId));
    expect(medlem?.role).toBe('dealer_admin');

    const brukt = await invitasjon.request(`/${token}`);
    expect(brukt.status).toBe(404);
    const bruktViaSide = await handleHono(
      new Request(`http://endwise.test/invitasjoner/${encodeURIComponent(token)}`),
    );
    expect(bruktViaSide.status).toBe(404);
    expect(await bruktViaSide.json()).toEqual({
      gyldig: false,
      grunn: 'Invitasjonen er ugyldig, brukt eller utløpt.',
    });
  });

  it('dealer_admin i den nye tenanten kan ikke grant-e egne moduler', async () => {
    const slug = `grant-${randomUUID().slice(0, 8)}`;
    const epost = `grant.${slug}@verksted.test`;
    const opprettet = await somEndwise().tenants.create({
      name: 'Grant nei',
      slug,
      ownerEmail: epost,
      kind: 'demo',
      modules: ['quick'],
    });
    tenantIds.push(opprettet.tenantId);

    await forventer(
      appRouter
        .createCaller(ctx(app, 'dealer_admin', opprettet.tenantId, 'dealer-i-tenant'))
        .tenants.setModules({ tenantId: opprettet.tenantId, modules: ['ai-support'] }),
      'FORBIDDEN',
    );

    const mods = await owner
      .select({ key: schema.tenantModules.moduleKey })
      .from(schema.tenantModules)
      .where(eq(schema.tenantModules.tenantId, opprettet.tenantId));
    expect(mods.map((m) => m.key)).toEqual(['quick']);
  });

  it('endwise_admin kan redigere tillegg senere, og det audit-logges', async () => {
    const slug = `edit-${randomUUID().slice(0, 8)}`;
    const opprettet = await somEndwise().tenants.create({
      name: 'Edit AS',
      slug,
      ownerEmail: `edit.${slug}@verksted.test`,
      kind: 'demo',
      modules: ['quick'],
    });
    tenantIds.push(opprettet.tenantId);

    const etter = await somEndwise().tenants.setModules({
      tenantId: opprettet.tenantId,
      modules: ['vegvesen'],
    });
    expect(etter.granted).toEqual(['vegvesen']);
    expect(etter.revoked).toEqual(['quick']);

    const mods = await owner
      .select({ key: schema.tenantModules.moduleKey, enabled: schema.tenantModules.enabled })
      .from(schema.tenantModules)
      .where(eq(schema.tenantModules.tenantId, opprettet.tenantId));
    expect(mods.find((m) => m.key === 'vegvesen')?.enabled).toBe(true);
    expect(mods.find((m) => m.key === 'quick')?.enabled).toBe(false);
  });

  it('veiviser: visningsnavn, hopp over extras beholder pakke, extras avviser fremmed nøkkel', async () => {
    const slug = `wiz-${randomUUID().slice(0, 8)}`;
    const opprettet = await somEndwise().tenants.create({
      name: 'Wizard AS',
      slug,
      ownerEmail: `wiz.${slug}@verksted.test`,
      kind: 'demo',
      modules: ['quick'],
      optional: ['vegvesen'],
    });
    tenantIds.push(opprettet.tenantId);

    const eier = appRouter.createCaller(ctx(app, 'dealer_admin', opprettet.tenantId, adminUser));

    await forventer(
      eier.onboarding.fullfor({ visningsnavn: 'Nytt navn AS', extras: ['ai-support'] }),
      'BAD_REQUEST',
    );

    const hopp = await eier.onboarding.fullfor({
      visningsnavn: 'Nytt visningsnavn AS',
      extras: [],
    });
    expect(hopp.visningsnavn).toBe('Nytt visningsnavn AS');
    expect(hopp.granted).toEqual([]);

    const [tenant] = await owner
      .select({
        name: schema.tenants.name,
        ferdig: schema.tenants.onboardingCompletedAt,
      })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, opprettet.tenantId));
    expect(tenant?.name).toBe('Nytt visningsnavn AS');
    expect(tenant?.ferdig).toBeTruthy();

    const mods = await owner
      .select({
        key: schema.tenantModules.moduleKey,
        enabled: schema.tenantModules.enabled,
        source: schema.tenantModules.source,
      })
      .from(schema.tenantModules)
      .where(eq(schema.tenantModules.tenantId, opprettet.tenantId));
    expect(mods.find((m) => m.key === 'quick')?.enabled).toBe(true);
    expect(mods.find((m) => m.key === 'vegvesen')?.enabled).toBe(false);
  });

  it('veiviser: extras slår på optional, staff-invite kan ikke bli dealer_admin', async () => {
    const slug = `wiz2-${randomUUID().slice(0, 8)}`;
    const opprettet = await somEndwise().tenants.create({
      name: 'Wizard to',
      slug,
      ownerEmail: `wiz2.${slug}@verksted.test`,
      kind: 'demo',
      modules: ['quick'],
      optional: ['vegvesen'],
    });
    tenantIds.push(opprettet.tenantId);

    const eier = appRouter.createCaller(ctx(app, 'dealer_admin', opprettet.tenantId, adminUser));

    await expect(
      eier.invitasjoner.opprett({ epost: 'sjef@x.no', funksjon: 'leder' as never }),
    ).rejects.toThrow();

    const staff = await eier.invitasjoner.opprett({
      epost: `selger.${slug}@verksted.test`,
      funksjon: 'selger',
    });
    expect(staff.funksjon).toBe('selger');
    const [inv] = await owner
      .select({ role: schema.invitations.role, kind: schema.invitations.kind })
      .from(schema.invitations)
      .where(eq(schema.invitations.id, staff.id));
    expect(inv?.role).toBe('dealer_staff');
    expect(inv?.kind).toBe('staff');

    const ferdig = await eier.onboarding.fullfor({
      visningsnavn: 'Wizard to AS',
      extras: ['vegvesen'],
    });
    expect(ferdig.granted).toEqual(['vegvesen']);

    const mods = await owner
      .select({
        key: schema.tenantModules.moduleKey,
        enabled: schema.tenantModules.enabled,
        source: schema.tenantModules.source,
      })
      .from(schema.tenantModules)
      .where(eq(schema.tenantModules.tenantId, opprettet.tenantId));
    expect(mods.find((m) => m.key === 'vegvesen')?.enabled).toBe(true);
    expect(mods.find((m) => m.key === 'vegvesen')?.source).toBe('dealer');
    expect(mods.find((m) => m.key === 'quick')?.enabled).toBe(true);
  });
});
