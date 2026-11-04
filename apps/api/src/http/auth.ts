import {
  createAuth,
  kjorMedAuthRequest,
  lesAuthSone,
  lesTenantIdFraSlug,
  settAuthTenantId,
} from '@endwise/auth';
import { createDb, type Database } from '@endwise/db';

let authDb: Database | undefined;
function getAuthDb(): Database | null {
  if (authDb) return authDb;
  const url = process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) return null;
  authDb = createDb(url);
  return authDb;
}

/**
 * Better-Auth som Web Request/Response, uten Hono.
 * F5: platform-sone får egen instans (cookie-prefiks, kort sesjon, passkey).
 * Uten flagg: samme instans som før.
 */
let defaultAuth: ReturnType<typeof createAuth> | undefined;
let platformAuth: ReturnType<typeof createAuth> | undefined;
let appAuth: ReturnType<typeof createAuth> | undefined;
const forhandlerAuth = new Map<string, ReturnType<typeof createAuth>>();

function getAuth(req: Request) {
  const sone = lesAuthSone(req.headers);
  const slug = req.headers.get('x-endwise-slug')?.trim();
  if (sone === 'platform') {
    platformAuth ??= createAuth(undefined, { sone: 'platform' });
    return platformAuth;
  }
  if (sone === 'app') {
    appAuth ??= createAuth(undefined, { sone: 'app' });
    return appAuth;
  }
  if (sone === 'forhandler' && slug) {
    const eksisterende = forhandlerAuth.get(slug);
    if (eksisterende) return eksisterende;
    const opprettet = createAuth(undefined, { sone: 'forhandler', slug });
    forhandlerAuth.set(slug, opprettet);
    return opprettet;
  }
  defaultAuth ??= createAuth(undefined, sone ? { sone } : undefined);
  return defaultAuth;
}

export async function handleAuth(req: Request): Promise<Response> {
  return kjorMedAuthRequest({ headers: req.headers }, async () => {
    const slug = req.headers.get('x-endwise-slug')?.trim();
    if (slug) {
      const db = getAuthDb();
      if (db) {
        const tenantId = await lesTenantIdFraSlug(db, slug).catch(() => null);
        settAuthTenantId(tenantId);
      }
    }
    return getAuth(req).handler(req);
  });
}
