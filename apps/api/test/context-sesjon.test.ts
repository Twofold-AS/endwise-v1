import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireSession = vi.hoisted(() => vi.fn());

vi.mock('@endwise/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@endwise/auth')>();
  return {
    ...actual,
    createAuth: () => ({}),
    requireSession,
  };
});

process.env.APP_DATABASE_URL ??= 'postgresql://endwise:endwise@127.0.0.1:5432/endwise';

import { createRequestContext } from '../src/context.ts';

/**
 * Uautentisert tRPC (f.eks. stream.since hvert 8. s uten sesjon) skal
 * returnere tom context uten Better-Auth-sesjonsoppslag mot Postgres.
 * protectedProcedure kaster fortsatt 401. Produktregler urørt.
 */
describe('createRequestContext uten sesjonskake', () => {
  beforeEach(() => {
    requireSession.mockReset();
    requireSession.mockRejectedValue(new Error('skal ikke kalles uten kake'));
  });

  it('uten cookie: uautentisert og kaller ikke requireSession', async () => {
    const ctx = await createRequestContext(new Headers());
    expect(requireSession).not.toHaveBeenCalled();
    expect(ctx.userId).toBeNull();
    expect(ctx.tenantId).toBeNull();
    expect(ctx.role).toBeNull();
  });

  it('two_factor-kake alene er ikke sesjon — ingen DB-oppslag', async () => {
    const ctx = await createRequestContext(new Headers({ cookie: 'endwise.two_factor=abc' }));
    expect(requireSession).not.toHaveBeenCalled();
    expect(ctx.userId).toBeNull();
  });

  it('med session_token: går gjennom requireSession (produktregler urørt)', async () => {
    requireSession.mockRejectedValue(new Error('idle'));
    const ctx = await createRequestContext(new Headers({ cookie: 'endwise.session_token=abc' }));
    expect(requireSession).toHaveBeenCalledTimes(1);
    expect(ctx.userId).toBeNull();
  });
});
