import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@endwise/modules/tenant-host', async (orig) => {
  const mod = await orig();
  return {
    ...mod,
    erWhiteLabelAktiv: vi.fn(() => false),
  };
});

import { erWhiteLabelAktiv } from '@endwise/modules/tenant-host';
import { appRouter } from '../src/trpc/router.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

const staff = () =>
  ({
    db: {} as never,
    events: { publish: async () => {} } as never,
    tenantId: '00000000-0000-0000-0000-000000000001',
    userId: 'til-staff-f7',
    role: 'dealer_staff',
    isMechanic: false,
    kontekst: 'privat',
    hostTenantId: '00000000-0000-0000-0000-000000000001',
    requestHeaders: new Headers(),
    authSone: 'forhandler',
    passkeyOk: false,
    jobFunction: null,
    mechanicId: null,
  }) as never;

describe('F26 / white label F7: Privat/Bedrift porter', () => {
  beforeEach(() => {
    vi.mocked(erWhiteLabelAktiv).mockReturnValue(true);
  });

  it('Bedrift-API i Privat uten CSRF gir 403', async () => {
    await expect(appRouter.createCaller(staff()).team.list()).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'Krever Bedrift',
    });
  });

  it('kilde: kontekst-router, customerProcedure, CSRF og rotasjon', () => {
    expect(les('../src/trpc/routers/kontekst.ts')).toMatch(/KONTEKST_AUDIT/);
    expect(les('../src/trpc/routers/kontekst.ts')).toMatch(/verifiserFerskTotpForBruker/);
    expect(les('../src/trpc/init.ts')).toMatch(/krevBedriftFlate/);
    expect(les('../src/trpc/init.ts')).toMatch(/customerProcedure/);
    expect(les('../src/trpc/routers/tillatelse.ts')).toMatch(/verifiserFerskTotpForBruker/);
    expect(les('../src/trpc/routers/personvern.ts')).toMatch(/verifiserFerskTotpForBruker/);
    expect(les('../src/context.ts')).toMatch(/hostTenantId/);
    expect(les('../src/http/trpc.ts')).toMatch(/Set-Cookie/);
  });
});
