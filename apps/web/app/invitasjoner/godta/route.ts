import { handleHono } from '@endwise/api/http/hono';

/**
 * F13-03 / F1-10 — offentlig POST `/invitasjoner/godta`.
 * Statisk `godta` vinner over `[token]` i Next.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'cdg1';

export function POST(req: Request) {
  return handleHono(req);
}
