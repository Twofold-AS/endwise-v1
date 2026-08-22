import { describe, expect, it, vi } from 'vitest';

vi.mock('@endwise/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@endwise/auth')>();
  return {
    ...actual,
    createAuth: () => ({
      handler: async (req: Request) => {
        const path = new URL(req.url).pathname;
        return new Response(JSON.stringify({ ok: true, path }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'set-cookie': 'endwise.session_token=test; Path=/; HttpOnly; SameSite=Lax',
          },
        });
      },
    }),
  };
});

import { handleAuth } from '../src/http/auth.ts';

/**
 * F13-03 — Better-Auth-handleren videresender Request og bevarer Set-Cookie.
 * Same-origin i Next gjør cookien førsteparts; denne testen beviser at
 * headeren overlever handleren, ikke at Better-Auth selv setter den.
 */
describe('handleAuth', () => {
  it('videresender requesten og returnerer Set-Cookie', async () => {
    const req = new Request('http://endwise.test/api/auth/ok', { method: 'GET' });
    const res = await handleAuth(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, path: '/api/auth/ok' });
    expect(res.headers.get('set-cookie')).toContain('endwise.session_token=');
    expect(res.headers.get('set-cookie')).toContain('HttpOnly');
  });
});
