import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { appRouter } from '../src/trpc/router.ts';

/**
 * Se verkstedet: READ via slug, mutations 403. Ingen setActive.
 */
async function forventer(
  kall: Promise<unknown>,
  code: 'FORBIDDEN' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'BAD_REQUEST',
) {
  await expect(kall).rejects.toMatchObject({ code });
}

const fakeCtx = (role: 'endwise_admin' | 'endwise_support' | 'dealer_admin' | 'dealer_staff') =>
  ({
    db: {} as never,
    events: { publish: async () => {} } as never,
    tenantId: '00000000-0000-0000-0000-000000000001',
    userId: `ins-fake-${role}`,
    role,
  }) as never;

describe('Se verkstedet — kun lesing', () => {
  it('verksted.skriv er 403 for admin og support', async () => {
    await forventer(
      appRouter.createCaller(fakeCtx('endwise_admin')).verksted.skriv({ slug: 'verksted-a' }),
      'FORBIDDEN',
    );
    await forventer(
      appRouter.createCaller(fakeCtx('endwise_support')).verksted.skriv({ slug: 'verksted-a' }),
      'FORBIDDEN',
    );
  });

  it('⛔ ANGREP: dealer_admin kan ikke inspect', async () => {
    await forventer(
      appRouter.createCaller(fakeCtx('dealer_admin')).verksted.meta({ slug: 'verksted-a' }),
      'FORBIDDEN',
    );
  });

  it('kilde bruker slug, withPlatformInspect og endwiseInspectProcedure — ikke setActive', () => {
    const her = dirname(fileURLToPath(import.meta.url));
    const verksted = readFileSync(resolve(her, '../src/trpc/routers/verksted.ts'), 'utf8');
    const init = readFileSync(resolve(her, '../src/trpc/init.ts'), 'utf8');
    expect(verksted).toMatch(/withPlatformInspect/);
    expect(verksted).toMatch(/endwiseInspectProcedure/);
    expect(verksted).toMatch(/slug/);
    expect(verksted).not.toMatch(/setActive|impersonat/i);
    expect(init).toMatch(/Kun lesing/);
    expect(init).toMatch(/opts\.type === 'mutation'/);
  });
});
