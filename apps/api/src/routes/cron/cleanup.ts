import { Hono } from 'hono';
import { cronAuth } from '../../lib/cron-auth.ts';
import { nightlyCleanupWorkflow } from '../../workflows/cleanup.ts';

/**
 * Vercel Cron treffer denne (se apps/api/vercel.json). Cron starter workflowen;
 * selve arbeidet er durable og lever videre uavhengig av request-livssyklusen.
 *
 * CWE-306: `cronAuth`-middleware feiler LUKKET (503 uten CRON_SECRET, 401 ved feil
 * Bearer) — kjører før handleren. Tidligere slapp den alt gjennom uten secret.
 */
export const cronCleanup = new Hono().use('*', cronAuth).get('/', async (c) => {
  const result = await nightlyCleanupWorkflow({ olderThanDays: 30 });
  return c.json(result);
});
