import { handleHono } from '@endwise/api/http/hono';

/**
 * F13-03 / F14-03 — Vercel Cron for retensjon. Auth: Bearer CRON_SECRET.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';
export const maxDuration = 300;

export function GET(req: Request) {
  return handleHono(req);
}
