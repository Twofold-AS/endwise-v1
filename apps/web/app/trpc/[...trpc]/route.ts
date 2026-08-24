import { handleTrpc } from '@endwise/api/http/trpc';

/**
 * F13-03 — tRPC same-origin. Klienten (`httpBatchLink` mot `/trpc`) sender
 * sesjonscookien med `credentials: 'include'`. Ingen rewrite til localhost.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'cdg1';

export function GET(req: Request) {
  return handleTrpc(req);
}

export function POST(req: Request) {
  return handleTrpc(req);
}
