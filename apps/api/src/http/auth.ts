import { createAuth } from '@endwise/auth';

/**
 * Better-Auth som Web Request/Response, uten Hono.
 * `handler(request)` setter `Set-Cookie` på svaret. Når Next.js returnerer
 * den Responsen same-origin (`/api/auth/*` på `apps/web`), er cookien
 * førsteparts: `credentials: 'include'` på tRPC og Better-Auth-klienten
 * (ingen baseURL-overstyring) sender den med automatisk. Ingen CORS, ingen
 * rewrite til localhost.
 * Lat initialisering: env-variablene skal ikke kreves ved import (build/test).
 */
let authInstance: ReturnType<typeof createAuth> | undefined;

function getAuth() {
  authInstance ??= createAuth();
  return authInstance;
}

export function handleAuth(req: Request): Promise<Response> {
  return getAuth().handler(req);
}
