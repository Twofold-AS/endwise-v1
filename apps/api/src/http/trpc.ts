import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { createRequestContext } from '../context.ts';
import { appRouter } from '../trpc/router.ts';

/**
 * Trpc som Web Request/Response, uten Hono.
 * Samme `fetchRequestHandler` som Hono-skallet brukte. Next.js route handlers
 * og den lokale `serve`-prosessen kaller begge denne, så Vercel trenger
 * ikke `API_INTERNAL_URL` mot localhost.
 * TOTP er valgfri: TWO_FACTOR_REQUIRED mappes ikke til FORBIDDEN som tømmer UI.
 */
export async function handleTrpc(req: Request): Promise<Response> {
  const kaker: string[] = [];
  const ctx = await createRequestContext(req.headers);
  ctx.setAuthCookie = (cookie) => kaker.push(cookie);
  const res = await fetchRequestHandler({
    endpoint: '/trpc',
    req,
    router: appRouter,
    createContext: () => ctx,
  });
  if (kaker.length === 0) return res;
  const headers = new Headers(res.headers);
  for (const kake of kaker) headers.append('Set-Cookie', kake);
  return new Response(res.body, { status: res.status, headers });
}
