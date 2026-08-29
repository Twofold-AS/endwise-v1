import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb, type Database, eq, schema } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appRouter } from '../src/trpc/router.ts';
import {
  erManglendeDealerProfil,
  hentForhandlerKort,
  somLeftover,
  tomtForhandlerKort,
} from '../src/trpc/routers/forhandler.ts';

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

  it('get og inspect bruker hentForhandlerKort, ikke rå lesForhandlerKort', () => {
    const get = les('../src/trpc/routers/forhandler.ts');
    const inspect = les('../src/trpc/routers/verksted.ts');
    expect(get).toMatch(/hentForhandlerKort/);
    expect(get).toMatch(/get:\s*adminProcedure\.query/);
    expect(get).toMatch(/kort:\s*protectedProcedure\.query/);
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
