import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { appRouter } from '../src/trpc/router.ts';

async function forventer(
  kall: Promise<unknown>,
  code: 'FORBIDDEN' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'BAD_REQUEST' | 'PRECONDITION_FAILED',
) {
  await expect(kall).rejects.toMatchObject({ code });
}

const fakeCtx = (role: 'endwise_admin' | 'endwise_support' | 'dealer_admin') =>
  ({
    db: {} as never,
    events: { publish: async () => {} } as never,
    tenantId: '00000000-0000-0000-0000-000000000001',
    userId: `jit-fake-${role}`,
    role,
    authSone: null,
    passkeyOk: false,
  }) as never;

describe('F22 / white label F5b: JIT-porter', () => {
  it('uten flagg er skriv og jit 403/precondition, dealer stenges', async () => {
    await forventer(
      appRouter.createCaller(fakeCtx('endwise_admin')).verksted.skriv({ slug: 'bergen' }),
      'FORBIDDEN',
    );
    await forventer(
      appRouter.createCaller(fakeCtx('endwise_support')).jit.sok({
        slug: 'bergen',
        begrunnelse: 'Må rette en hengende booking i Bergen sentrum.',
      }),
      'PRECONDITION_FAILED',
    );
    await forventer(
      appRouter.createCaller(fakeCtx('dealer_admin')).jit.oversikt({ slug: 'bergen' }),
      'FORBIDDEN',
    );
    await forventer(
      appRouter.createCaller(fakeCtx('dealer_admin')).aktivitet.endwise(),
      'PRECONDITION_FAILED',
    );
  });

  it('kilde: to godkjenninger, varsel, ingen dealer-sesjon, plattform-admin uten JIT', () => {
    const her = dirname(fileURLToPath(import.meta.url));
    const jit = readFileSync(resolve(her, '../src/trpc/routers/jit.ts'), 'utf8');
    const verksted = readFileSync(resolve(her, '../src/trpc/routers/verksted.ts'), 'utf8');
    const flags = readFileSync(resolve(her, '../src/trpc/routers/flags.ts'), 'utf8');
    const tenants = readFileSync(resolve(her, '../src/trpc/routers/tenants.ts'), 'utf8');
    expect(jit).toMatch(/nesteEtterGodkjenning/);
    expect(jit).toMatch(/varsleLeder|byggJitVarsel/);
    expect(jit).toMatch(/dealer_admin/);
    expect(verksted).toMatch(/krevAktivJitSkriv/);
    expect(verksted).toMatch(/Kun lesing/);
    expect(verksted).not.toMatch(/organization\.setActive|impersonat/i);
    expect(flags).not.toMatch(/krevAktivJitSkriv|jitGrants/);
    expect(tenants).not.toMatch(/krevAktivJitSkriv|jitGrants/);
  });
});
