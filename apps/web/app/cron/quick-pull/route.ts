import { handleHono } from '@endwise/api/http/hono';

/**
 * F13-03 / F8-01 — Vercel Cron for Quick-pull (DST-guard i handleren).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';
export const maxDuration = 300;

export function GET(req: Request) {
  return handleHono(req);
}
