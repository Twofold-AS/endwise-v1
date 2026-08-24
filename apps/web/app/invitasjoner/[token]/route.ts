import { handleHono } from '@endwise/api/http/hono';

/**
 * F13-03 / F1-10 — offentlig GET `/invitasjoner/:token`.
 *
 * ⚠️ FLERTALL med vilje. SIDEN ligger på `/invitasjon/[token]`.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'cdg1';

export function GET(req: Request) {
  return handleHono(req);
}
