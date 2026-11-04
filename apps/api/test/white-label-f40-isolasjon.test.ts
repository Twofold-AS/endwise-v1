import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

const requireSession = vi.hoisted(() => vi.fn());
const lesTenantIdFraSlug = vi.hoisted(() => vi.fn());

vi.mock('@endwise/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@endwise/auth')>();
  return {
    ...actual,
    createAuth: () => ({}),
    requireSession,
    lesTenantIdFraSlug,
  };
});

process.env.APP_DATABASE_URL ??= 'postgresql://endwise:endwise@127.0.0.1:5432/endwise';

import { createRequestContext } from '../src/context.ts';
import { appRouter } from '../src/trpc/router.ts';

const moss = '11111111-1111-1111-1111-111111111111';
const bergen = '22222222-2222-2222-2222-222222222222';

describe('F40 — host-isolasjon i context', () => {
  beforeEach(() => {
    requireSession.mockReset();
    lesTenantIdFraSlug.mockReset();
  });

  it('Moss-sesjon på Bergen-vert gir ingen userId (logout)', async () => {
    lesTenantIdFraSlug.mockResolvedValue(bergen);
    requireSession.mockResolvedValue({
      user: { id: 'bruker-moss' },
      session: { id: 'sesjon', activeOrganizationId: moss },
    });
    const ctx = await createRequestContext(
      new Headers({
        cookie: 'endwise.session_token=abc',
        'x-endwise-sone': 'forhandler',
        'x-endwise-slug': 'bergen',
      }),
    );
    expect(ctx.userId).toBeNull();
    expect(ctx.tenantId).toBeNull();
    expect(ctx.hostTenantId).toBe(bergen);
  });

  it('forhandler-vert uten kjent slug faller ikke tilbake på sesjon-org', async () => {
    lesTenantIdFraSlug.mockResolvedValue(null);
    requireSession.mockResolvedValue({
      user: { id: 'bruker-moss' },
      session: { id: 'sesjon', activeOrganizationId: moss },
    });
    const ctx = await createRequestContext(
      new Headers({
        cookie: 'endwise.session_token=abc',
        'x-endwise-sone': 'forhandler',
        'x-endwise-slug': 'ukjent-slug',
      }),
    );
    expect(ctx.userId).toBeNull();
    expect(ctx.tenantId).toBeNull();
    expect(ctx.hostTenantId).toBeNull();
  });
});

describe('F40 — OTP og customerProcedure er tenant-bundet', () => {
  it('beOmKode slår opp kunder på hostTenantId', () => {
    const rute = les('../src/trpc/routers/kunde.ts');
    expect(rute).toMatch(/const tenantId = ctx\.hostTenantId/);
    expect(rute).toMatch(/eq\(schema\.customers\.tenantId, tenantId\)/);
    expect(rute).toMatch(/return \{ ok: true as const \}/);
  });

  it('customerProcedure 403 ved host ≠ sesjon på forhandler-vert', () => {
    const init = les('../src/trpc/init.ts');
    expect(init).toMatch(/kundeTenantFraHost/);
    expect(init).toMatch(/Ingen kundeside her/);
    expect(les('../src/context.ts')).toMatch(/vertSesjonTillatt/);
  });

  it('kunde.meg 403 når host og sesjon er ulike forhandlere', async () => {
    const caller = appRouter.createCaller({
      db: {} as never,
      events: { publish: async () => {} } as never,
      userId: 'bruker',
      tenantId: moss,
      hostTenantId: bergen,
      role: 'customer',
      kontekst: 'privat',
      authSone: 'forhandler',
      passkeyOk: false,
      jobFunction: null,
      isMechanic: false,
      mechanicId: null,
      requestHeaders: new Headers(),
    } as never);
    await expect(caller.kunde.meg()).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'Ingen kundeside her',
    });
  });
});

describe('F40 — Ny forhandler avviser reserverte subdomener', () => {
  const admin = () =>
    appRouter.createCaller({
      db: {} as never,
      events: { publish: async () => {} } as never,
      userId: 'admin',
      tenantId: '00000000-0000-0000-0000-000000000001',
      hostTenantId: null,
      role: 'endwise_admin',
      kontekst: 'bedrift',
      authSone: 'platform',
      passkeyOk: true,
      jobFunction: null,
      isMechanic: false,
      mechanicId: null,
      requestHeaders: new Headers({ 'x-endwise-csrf': '1' }),
    } as never);

  it.each(['www', 'app', 'platform', 'api'])('create avviser %s', async (slug) => {
    await expect(
      admin().tenants.create({
        name: 'Ulovlig',
        slug,
        ownerEmail: 'eier@x.no',
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});
