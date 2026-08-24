import { handleHealth } from '@endwise/api/http/health';

/** F13-03 — `/health` same-origin. Ingen DB. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'cdg1';

export function GET() {
  return handleHealth();
}
