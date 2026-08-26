import { createDb, schema } from '@endwise/db';
import { Hono } from 'hono';
import { cronAuth } from '../../lib/cron-auth.ts';
import { osloHour, QUICK_PULL_HOURS_OSLO } from '../../lib/oslo-time.ts';
import { runQuickCustomerPull } from '../../lib/quick-pull.ts';

/**
 * Planlagt Quick-pull (Quick → Endwise), 08:00 og 16:00 Europe/Oslo.
 * Tidssone: Vercel Cron er UTC-only og kan ikke uttrykke «08:00 Oslo» direkte
 * (offset skifter sommer/vinter). Vi løser det slik: vercel.json trigger denne
 * på alle aktuelle UTC-timer (06:00, 07:00, 14:00, 15:00 — dekker cet og cest),
 * og handleren kjører den ekte pullen kun når Oslo-timen faktisk er 08 eller 16.
 * Dst håndteres dermed korrekt via iana-sonen, ikke en hardkodet offset. De
 * «ekstra» trigger-timene (feil side av dst) blir no-ops.
 * Lokalt: cron kjører kun når appen er deployet (Vercel). Lokalt forblir pull
 * Manuell via «Hent nå» i UI-et / `quick.pullNow`.
 * Itererer tenants og puller hver for seg via `withTenant` → RLS. Forhandlere
 * uten Quick-config hoppes over (getDecrypted → null). Én forhandlers feil
 * stopper ikke de andre (feil samles, 200 med rapport).
 */
export const cronQuickPull = new Hono().use('*', cronAuth).get('/', async (c) => {
  // CWE-306: autentisering skjer i `cronAuth`-middleware (feiler lukket) før dette.
  // `?force=1` under kan derfor bare brukes av en allerede autentisert kaller
  // den forbigår kun tidsgaten, aldri autentiseringen.
  const hour = osloHour();
  const forced = c.req.query('force') === '1'; // for manuell test av selve jobben
  if (!forced && !QUICK_PULL_HOURS_OSLO.includes(hour as (typeof QUICK_PULL_HOURS_OSLO)[number])) {
    return c.json({ ok: true, skipped: true, osloHour: hour, runsAt: QUICK_PULL_HOURS_OSLO });
  }

  const url = process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) return c.json({ error: 'DATABASE_URL mangler' }, 500);

  const db = createDb(url);
  const tenants = await db.select({ id: schema.tenants.id }).from(schema.tenants);

  const results: Array<{ tenantId: string; ran: boolean; upserted?: number; error?: string }> = [];
  for (const tenant of tenants) {
    try {
      const res = await runQuickCustomerPull(db, tenant.id);
      results.push({ tenantId: tenant.id, ran: res.ran, upserted: res.upserted });
    } catch (error) {
      results.push({ tenantId: tenant.id, ran: false, error: (error as Error).message });
    }
  }

  const pulled = results.filter((r) => r.ran).length;
  return c.json({ ok: true, osloHour: hour, tenants: tenants.length, pulled, results });
});
