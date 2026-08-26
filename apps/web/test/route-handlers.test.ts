import { describe, expect, it } from 'vitest';
import { GET as authGet, POST as authPost } from '../app/api/auth/[...all]/route.ts';
import { GET as healthGet } from '../app/health/route.ts';
import { POST as stripePost } from '../app/stripe/webhook/route.ts';
import { GET as trpcGet, POST as trpcPost } from '../app/trpc/[...trpc]/route.ts';

/**
 * Route-filene eksporterer Web-handlere. Health beviser at
 * Vercel-appen svarer uten en kjørende `apps/api`-prosess.
 */
describe('porterte Next route handlers', () => {
  it('eksporterer GET/POST for tRPC og auth', () => {
    expect(trpcGet).toBeTypeOf('function');
    expect(trpcPost).toBeTypeOf('function');
    expect(authGet).toBeTypeOf('function');
    expect(authPost).toBeTypeOf('function');
    expect(stripePost).toBeTypeOf('function');
  });

  it('GET /health svarer uten apps/api-prosess', async () => {
    const res = healthGet();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, service: 'api' });
  });
});
