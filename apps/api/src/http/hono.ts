import { app } from '../app.ts';

/**
 * F13-03 — videresend en Web Request til Hono-appen.
 *
 * Brukes av Next-ruter som fortsatt eies av Hono-flaten: `/widget/*`,
 * `/chat/*`, `/invitasjoner/*`, `/cron/*`. URL-en på requesten er den
 * samme som Hono forventer (`/widget/init`, `/cron/cleanup`, …), så vi
 * rewrite-er ikke stien.
 *
 * Den lokale `serve()`-prosessen (`src/dev.ts`) fortsetter å bruke `app`
 * direkte. Vercel bruker denne funksjonen via Next route handlers.
 */
export function handleHono(req: Request): Response | Promise<Response> {
  return app.fetch(req);
}
