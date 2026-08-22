import { handleHono } from '@endwise/api/http/hono';

/**
 * F13-03 / F0-13 — Vercel Cron. Auth: `cronAuth` (Bearer CRON_SECRET).
 * Plan i `apps/web/vercel.json`.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';
export const maxDuration = 300;

export function GET(req: Request) {
  return handleHono(req);
}
