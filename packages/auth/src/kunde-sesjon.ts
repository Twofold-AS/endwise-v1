import { createDb } from '@endwise/db';
import { createAuth } from './auth.ts';
import { authEnv } from './env.ts';
import { lesTenantIdFraSlug } from './forhandler-konto.ts';
import { brukerErKundeHosTenant } from './produkt-destinasjon.ts';
import { harSesjonsCookie } from './session.ts';

let db: ReturnType<typeof createDb> | null = null;

function getDb() {
  db ??= createDb(authEnv.databaseUrl);
  return db;
}

/**
 * Cookie alene er ikke innlogget på <slug>.endwise.no.
 * Krever gyldig sesjon OG customers.userId hos host-tenanten.
 */
export async function kundeErInnloggetHosSlug(headers: Headers, slug: string): Promise<boolean> {
  const s = slug.trim();
  if (!s || !harSesjonsCookie(headers)) return false;
  try {
    const client = getDb();
    const tenantId = await lesTenantIdFraSlug(client, s);
    if (!tenantId) return false;
    const auth = createAuth(client, { sone: 'forhandler', slug: s });
    const sesjon = await auth.api.getSession({ headers });
    const userId = sesjon?.user?.id;
    if (!userId) return false;
    return brukerErKundeHosTenant(client, tenantId, userId);
  } catch {
    return false;
  }
}
