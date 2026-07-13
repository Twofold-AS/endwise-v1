import { Hono } from 'hono';
import { nightlyCleanupWorkflow } from '../../workflows/cleanup.ts';

/**
 * Vercel Cron treffer denne (se apps/api/vercel.json). Cron starter workflowen;
 * selve arbeidet er durable og lever videre uavhengig av request-livssyklusen.
 */
export const cronCleanup = new Hono().get('/', async (c) => {
  const secret = process.env.CRON_SECRET;
  if (secret && c.req.header('authorization') !== `Bearer ${secret}`) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  const result = await nightlyCleanupWorkflow({ olderThanDays: 30 });
  return c.json(result);
});
