import { serve } from '@hono/node-server';
import { createStreamApp } from './app.ts';

// Rot-.env lastes av dev-scriptet via `node --env-file-if-exists=../../.env`
// (Node auto-laster IKKE .env). Kjør `cp .env.example .env` og fyll inn verdiene.
// APP_DATABASE_URL = app-rollen (RLS på). Faller tilbake til DATABASE_URL (eier).
const databaseUrl = process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'Mangler database-URL: sett APP_DATABASE_URL (foretrukket, app-rolle/RLS) ' +
      'eller DATABASE_URL i .env. Se .env.example.',
  );
}

const { app, subscriber } = createStreamApp({ databaseUrl });
await subscriber.start();

const port = Number(process.env.PORT ?? 3002);
serve({ fetch: app.fetch, port });
console.info(`[stream] http://localhost:${port} — LISTEN aktiv`);
