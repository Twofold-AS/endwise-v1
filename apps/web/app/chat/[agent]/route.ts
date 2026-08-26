import { handleHono } from '@endwise/api/http/hono';

/**
 * F13-03 / F6-18 — strømmende AI-chat for `useChat`.
 * `DefaultChatTransport` peker på `/chat/<agent>`. Same-origin, så
 * sesjonscookien følger med. Modellen velges av agentens dataklasse
 * ikke Vercel AI Gateway.
 * Siden `/chat` (art. 50-demo) er `app/chat/page.tsx` og røres ikke.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'cdg1';
export const maxDuration = 60;

export function POST(req: Request) {
  return handleHono(req);
}
