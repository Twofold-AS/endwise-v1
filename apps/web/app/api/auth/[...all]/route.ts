import { handleAuth } from '@endwise/api/http/auth';

/**
 * F13-03 — Better-Auth same-origin.
 *
 * `handler(request)` leser `Cookie` og setter `Set-Cookie` på svaret
 * (`endwise.session_token`, prefix fra `cookiePrefix: 'endwise'`). Fordi
 * ruta lever på `apps/web` sitt origin, er cookien førsteparts. Klienten
 * (`createAuthClient` uten baseURL-overstyring) treffer `/api/auth/*` her,
 * ikke en annen host — derfor trengs ingen CORS og ingen `API_INTERNAL_URL`.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';

export function GET(req: Request) {
  return handleAuth(req);
}

export function POST(req: Request) {
  return handleAuth(req);
}
