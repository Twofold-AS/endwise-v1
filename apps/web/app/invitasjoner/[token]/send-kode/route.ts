import { handleHono } from '@endwise/api/http/hono';

/**
 * POST `/invitasjoner/:token/send-kode`.
 * Uten denne ruta traff aldri Hono — UI sa «Kode sendt» på 404.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'cdg1';

export function POST(req: Request) {
  return handleHono(req);
}
