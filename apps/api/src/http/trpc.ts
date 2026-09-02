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
export function handleTrpc(req: Request): Promise<Response> {
  return fetchRequestHandler({
    endpoint: '/trpc',
    req,
    router: appRouter,
    createContext: () => createRequestContext(req.headers),
  });
}
