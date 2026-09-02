import { createDb, schema } from '@endwise/db';
import { pruneExpired, RETENTION_POLICY } from '@endwise/modules/retention';
import { Hono } from 'hono';
import { cronAuth } from '../../lib/cron-auth.ts';

/**
 * Automatisk sletting, kjørt av Vercel Cron (se apps/web/vercel.json).
 * Itererer over tenants og rydder hver for seg gjennom `withTenant` → RLS.
 * Jobben har ingen global slette-tilgang; den kan ikke, ved en feil, tømme
 * feil forhandler.
 * CWE-306: `cronAuth`-middleware feiler lukket (503 uten CRON_SECRET, 401 ved feil
 * Bearer). Ekstra viktig her: dette endepunktet sletter data.
 */
export const cronRetention = new Hono().use('*', cronAuth).get('/', async (c) => {
  const url = process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) return c.json({ error: 'APP_DATABASE_URL (eller DATABASE_URL) mangler' }, 500);

  const db = createDb(url);
  const tenants = await db.select({ id: schema.tenants.id }).from(schema.tenants);

  const results = [];
  for (const tenant of tenants) {
    const pruned = await pruneExpired(db, tenant.id);
    results.push({ tenantId: tenant.id, pruned });
  }

  return c.json({
    ok: true,
    policy: RETENTION_POLICY.map((r) => ({ table: r.table, days: r.days, mode: r.mode })),
    tenants: results.length,
    results,
  });
});
