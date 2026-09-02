import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb, type Database, eq, schema } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MANGLER_TENANT_MELDING, manglendeTenantFeil } from '../src/trpc/manglende-tenant.ts';
import { appRouter } from '../src/trpc/router.ts';
import {
  erManglendeDealerProfil,
  hentForhandlerKort,
  kortFraOrgEllerTom,
  somLeftover,
  tomtForhandlerKort,
} from '../src/trpc/routers/forhandler.ts';
import { dealerNeedsOnboarding, landingEtterSesjon } from '../src/trpc/routers/session.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

async function forventer(kall: Promise<unknown>, code: 'FORBIDDEN' | 'UNAUTHORIZED') {
  await expect(kall).rejects.toMatchObject({ code });
}

const fakeCtx = (role: 'dealer_admin' | 'dealer_staff' | 'endwise_support') =>
  ({
    db: {} as never,
    events: { publish: async () => {} } as never,
    tenantId: '00000000-0000-0000-0000-000000000001',
    userId: `fh-fake-${role}`,
    role,
  }) as never;

describe('Forhandleren — rollegate', () => {
  it('staff kan ikke skrive (adminProcedure)', async () => {
    await forventer(
      appRouter.createCaller(fakeCtx('dealer_staff')).forhandler.update({
        name: 'Test AS',
        address: 'Gate 1',
      }),
      'FORBIDDEN',
    );
  });

  it('staff kan ikke lese (samme admin-gate som org-styring)', async () => {
    await forventer(appRouter.createCaller(fakeCtx('dealer_staff')).forhandler.get(), 'FORBIDDEN');
  });

  it('update skriver adresse uten Quick', () => {
    const src = les('../src/trpc/routers/forhandler.ts');
    expect(src).toMatch(/address: input\.address/);
    expect(src).not.toMatch(/probeQuick|clientInfo|mapQuickClientInfo/);
  });

  it('kilde er adminProcedure og rører ikke slug', () => {
    const src = les('../src/trpc/routers/forhandler.ts');
    expect(src).toMatch(/adminProcedure/);
    expect(src).toMatch(/dealerProfiles/);
    expect(src).not.toMatch(/slug:\s*input/);
    expect(src).not.toMatch(/kallenavn|nickname|visningsnavn|twoFactor/i);
  });
});

describe('Forhandleren — get uten 500 når profil mangler', () => {
  it('leftover som ikke er objekt blir {} — Zod/UI tåler det', () => {
    expect(somLeftover(null)).toEqual({});
    expect(somLeftover(undefined)).toEqual({});
    expect(somLeftover([])).toEqual({});
    expect(somLeftover('guid')).toEqual({});
    expect(somLeftover({ guid: 'cli-1' })).toEqual({ guid: 'cli-1' });
  });

  it('tomt kort har tenant-navn og tomme butikkfelt, ikke oppdiktede priser', () => {
    const kort = tomtForhandlerKort({ name: 'Yamaha Bergen', slug: 'yamaha-bergen' });
    expect(kort).toEqual({
      name: 'Yamaha Bergen',
      slug: 'yamaha-bergen',
      orgnr: '',
      address: '',
      postalCode: '',
      city: '',
      phone: '',
      email: '',
      website: '',
      leftover: {},
    });
    expect(kort).not.toHaveProperty('sellPriceMinor');
    expect(kort).not.toHaveProperty('kallenavn');
  });

  it('42P01 / 42703 / permission på dealer_profiles er «mangler»', () => {
    expect(
      erManglendeDealerProfil({
        message: 'Failed query: select from "dealer_profiles"',
        cause: { code: '42P01', message: 'relation "dealer_profiles" does not exist' },
      }),
    ).toBe(true);
    expect(
      erManglendeDealerProfil({
        cause: { code: '42703', message: 'column "quick_client" does not exist' },
      }),
    ).toBe(true);
    expect(
      erManglendeDealerProfil({
        message: 'Failed query: select from "dealer_profiles"',
        cause: { code: '42501', message: 'permission denied for table dealer_profiles' },
      }),
    ).toBe(true);
    expect(
      erManglendeDealerProfil({
        cause: { code: '23503', message: 'foreign key' },
      }),
    ).toBe(false);
  });

  it('hentForhandlerKort faller tilbake til tenant-kort når profil-tabellen mangler', async () => {
    const tomt = tomtForhandlerKort({ name: 'Yamaha Bergen', slug: 'yamaha-bergen' });
    let kall = 0;
    const kort = await hentForhandlerKort(async () => {
      kall += 1;
      if (kall === 1) {
        throw Object.assign(new Error('Failed query: select from "dealer_profiles"'), {
          cause: { code: '42P01', message: 'relation "dealer_profiles" does not exist' },
        });
      }
      return tomt;
    }, '00000000-0000-0000-0000-000000000099');

    expect(kall).toBe(2);
    expect(kort).toEqual(tomt);
  });

  function fakeTx(opts: {
    tenant?: { name: string; slug: string; kind?: 'live' | 'demo' | 'platform' };
    org?: { name: string; slug: string };
    profilFeil?: unknown;
  }) {
    return {
      select: () => ({
        from: (table: unknown) => ({
          where: async () => {
            if (table === schema.tenants) return opts.tenant ? [opts.tenant] : [];
            if (table === schema.organization) return opts.org ? [opts.org] : [];
            if (table === schema.dealerProfiles) {
              if (opts.profilFeil) throw opts.profilFeil;
              return [];
            }
            return [];
          },
        }),
      }),
    };
  }

  it('hentForhandlerKort uten tenants-rad gir org-kort, ikke NOT_FOUND', async () => {
    const org = { name: 'Yamaha Bergen', slug: 'yamaha-bergen' };
    const kort = await hentForhandlerKort(
      (fn) => fn(fakeTx({ org }) as never),
      '00000000-0000-0000-0000-000000000088',
    );
    expect(kort).toEqual(tomtForhandlerKort(org));
  });

  it('hentForhandlerKort uten tenants-rad og uten org gir tomt kort', async () => {
    const kort = await hentForhandlerKort(
      (fn) => fn(fakeTx({}) as never),
      '00000000-0000-0000-0000-000000000077',
    );
    expect(kort).toEqual(tomtForhandlerKort({ name: '', slug: '' }));
  });

  it('plattform-tenant gir tomt kort uten å kaste', async () => {
    const kort = await hentForhandlerKort(
      (fn) =>
        fn(
          fakeTx({
            tenant: { name: 'Endwise', slug: 'endwise', kind: 'platform' },
          }) as never,
        ),
      '00000000-0000-0000-0000-000000000066',
    );
    expect(kort).toEqual(tomtForhandlerKort({ name: '', slug: '' }));
  });

  it('kortFraOrgEllerTom bruker org-navn, plattform blir tomt', () => {
    expect(kortFraOrgEllerTom({ name: 'Yamaha Bergen', slug: 'yamaha-bergen' })).toEqual(
      tomtForhandlerKort({ name: 'Yamaha Bergen', slug: 'yamaha-bergen' }),
    );
    expect(kortFraOrgEllerTom({ name: 'Endwise', slug: 'endwise' })).toEqual(
      tomtForhandlerKort({ name: '', slug: '' }),
    );
    expect(kortFraOrgEllerTom(null)).toEqual(tomtForhandlerKort({ name: '', slug: '' }));
  });

  it('dealer_admin uten tenants-rad skal ikke onboardes', () => {
    expect(
      dealerNeedsOnboarding({
        role: 'dealer_admin',
        tenant: undefined,
        erPlattform: false,
      }),
    ).toBe(false);
    expect(
      dealerNeedsOnboarding({
        role: 'dealer_admin',
        tenant: { onboardingCompletedAt: null },
        erPlattform: false,
      }),
    ).toBe(true);
    expect(
      landingEtterSesjon({
        erPlattform: false,
        needsOnboarding: false,
        manglerTenant: true,
        harPlattformMedlemskap: true,
        role: 'dealer_admin',
        jobbfunksjon: 'leder',
      }),
    ).toBe('/endwise');
    expect(manglendeTenantFeil()).toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: MANGLER_TENANT_MELDING,
    });
  });

  it('get og inspect bruker hentForhandlerKort, ikke rå lesForhandlerKort', () => {
    const get = les('../src/trpc/routers/forhandler.ts');
    const inspect = les('../src/trpc/routers/verksted.ts');
    expect(get).toMatch(/hentForhandlerKort/);
    expect(get).toMatch(/get:\s*adminProcedure\.query/);
    expect(get).toMatch(/kort:\s*protectedProcedure\.query/);
    expect(get).toMatch(/loggManglendeTenantRad\('forhandler\.kort'/);
    expect(inspect).toMatch(/hentForhandlerKort/);
    expect(inspect).toMatch(/withPlatformInspect/);
  });
});

const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('Forhandleren — dealer_admin lagrer uten Quick', () => {
  let owner: Database;
  let app: Database;
  const tenant = randomUUID();

  const leder = () =>
    appRouter.createCaller({
      db: app,
      events: { publish: async () => {} } as never,
      tenantId: tenant,
      userId: `fh-admin-${tenant.slice(0, 8)}`,
      role: 'dealer_admin',
    } as never);

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);
    await owner.insert(schema.tenants).values({
      id: tenant,
      name: 'Gammelt navn',
      slug: `fh-${tenant.slice(0, 8)}`,
    });
    await owner.insert(schema.organization).values({
      id: tenant,
      name: 'Gammelt navn',
      slug: `fh-org-${tenant.slice(0, 8)}`,
      createdAt: new Date(),
    });
  });

  afterAll(async () => {
    await owner.delete(schema.dealerProfiles).where(eq(schema.dealerProfiles.tenantId, tenant));
    await owner.delete(schema.organization).where(eq(schema.organization.id, tenant));
    await owner.delete(schema.tenants).where(eq(schema.tenants.id, tenant));
  });

  it('get uten dealer_profiles-rad gir tenant-navn og tomme butikkfelt', async () => {
    const kort = await leder().forhandler.get();
    expect(kort.name).toBe('Gammelt navn');
    expect(kort.slug).toBe(`fh-${tenant.slice(0, 8)}`);
    expect(kort.address).toBe('');
    expect(kort.orgnr).toBe('');
    expect(kort.leftover).toEqual({});
    expect(kort).not.toHaveProperty('sellPriceMinor');
  });

  it('lagrer adresse og lar slug stå', async () => {
    const lagret = await leder().forhandler.update({
      name: 'Gammelt navn',
      address: 'Gate 1',
      postalCode: '5003',
      city: 'Bergen',
    });
    expect(lagret.address).toBe('Gate 1');
    expect(lagret.postalCode).toBe('5003');
    expect(lagret.city).toBe('Bergen');
    expect(lagret.slug).toBe(`fh-${tenant.slice(0, 8)}`);
    expect(lagret.name).toBe('Gammelt navn');
  });
});

describeDb('Forhandleren — org uten tenants-rad', () => {
  let owner: Database;
  let app: Database;
  const tenant = randomUUID();
  const userId = `fh-mangler-${tenant.slice(0, 8)}`;
  const orgNavn = 'Org uten tenant';
  const orgSlug = `fh-org-${tenant.slice(0, 8)}`;

  const leder = () =>
    appRouter.createCaller({
      db: app,
      events: { publish: async () => {} } as never,
      tenantId: tenant,
      userId,
      role: 'dealer_admin',
    } as never);

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);
    await owner.insert(schema.organization).values({
      id: tenant,
      name: orgNavn,
      slug: orgSlug,
      createdAt: new Date(),
    });
    await owner.insert(schema.user).values({
      id: userId,
      name: 'Eier uten tenant',
      email: `${userId}@test.invalid`,
      emailVerified: true,
    });
    await owner.insert(schema.member).values({
      id: randomUUID(),
      organizationId: tenant,
      userId,
      role: 'dealer_admin',
      createdAt: new Date(),
    });
  });

  afterAll(async () => {
    await owner.delete(schema.member).where(eq(schema.member.userId, userId));
    await owner.delete(schema.user).where(eq(schema.user.id, userId));
    await owner.delete(schema.organization).where(eq(schema.organization.id, tenant));
  });

  it('kort er 200 med org-navn når tenants-rad mangler', async () => {
    const kort = await leder().forhandler.kort();
    expect(kort).toEqual(tomtForhandlerKort({ name: orgNavn, slug: orgSlug }));
  });

  it('session.me er 200 med needsOnboarding false', async () => {
    const me = await leder().session.me();
    expect(me.needsOnboarding).toBe(false);
    expect(me.landing).not.toBe('/oppstart');
    expect(me.tenantName).toBe(orgNavn);
  });

  it('onboarding.status er ikke ferdig — raden mangler, ikke fullført', async () => {
    const status = await leder().onboarding.status();
    expect(status.complete).toBe(false);
    expect(status.visningsnavn).toBe('');
  });

  it('onboarding.fullfor er PRECONDITION_FAILED, ikke NOT_FOUND eller complete', async () => {
    await expect(
      leder().onboarding.fullfor({
        visningsnavn: 'Nytt navn AS',
        extras: [],
      }),
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: MANGLER_TENANT_MELDING,
    });
  });
});
