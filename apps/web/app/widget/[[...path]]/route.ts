import { handleHono } from '@endwise/api/http/hono';

/**
 * Offentlig `/widget/*` (publishable key + kortlevd token, CORS).
 * Hono eier flaten; Next videresender Web Request uendret.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'cdg1';

export function GET(req: Request) {
  return handleHono(req);
}

export function POST(req: Request) {
  return handleHono(req);
}

export function OPTIONS(req: Request) {
  return handleHono(req);
}
