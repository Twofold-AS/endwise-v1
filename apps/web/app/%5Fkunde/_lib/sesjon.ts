import { createAuth, harSesjonsCookie, lesTenantIdFraSlug } from '@endwise/auth';
import { and, createDb, eq, schema, withTenant } from '@endwise/db';
import type { Route } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

let db: ReturnType<typeof createDb> | null = null;

function getDb() {
  const url = process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) return null;
  db ??= createDb(url);
  return db;
}

/** Innlogget = gyldig sesjon OG kunde hos DENNE tenanten. Cookie alene er ikke nok. */
export async function kundeErInnlogget(): Promise<boolean> {
  const h = await headers();
  if (!harSesjonsCookie(h)) return false;
  const slug = h.get('x-endwise-slug')?.trim();
  if (!slug) return false;
  const client = getDb();
  if (!client) return false;
  try {
    const tenantId = await lesTenantIdFraSlug(client, slug);
    if (!tenantId) return false;
    const auth = createAuth(client, { sone: 'forhandler', slug });
    const sesjon = await auth.api.getSession({ headers: h });
    const userId = sesjon?.user?.id;
    if (!userId) return false;
    const [kunde] = await withTenant(client, tenantId, (tx) =>
      tx
        .select({ id: schema.customers.id })
        .from(schema.customers)
        .where(and(eq(schema.customers.tenantId, tenantId), eq(schema.customers.userId, userId)))
        .limit(1),
    );
    return Boolean(kunde);
  } catch {
    return false;
  }
}

export async function krevKundeInnlogging(): Promise<void> {
  if (!(await kundeErInnlogget())) redirect('/logg-inn' as Route);
}
