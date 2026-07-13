import { Hono } from 'hono';

/**
 * apps/stream — SSE-tjenesten (Hono + Postgres LISTEN/NOTIFY).
 * F0 setter kun opp skallet og Vercel-prosjektet (F0-07).
 * Selve SSE-laget (heartbeat ~15s, Last-Event-ID-reconnect, tilkoblings-caps)
 * bygges i F6-02 — ikke før. Ingen Redis: pub/sub er LISTEN/NOTIFY.
 */
const app = new Hono();

app.get('/health', (c) => c.json({ ok: true, service: 'stream' }));

export { app };
export default app;
