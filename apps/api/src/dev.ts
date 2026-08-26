import { serve } from '@hono/node-server';
import app from './app.ts';

/**
 * Valgfri lokal `serve`. F13-03: Vercel og `next dev` bruker Next route
 * handlers, ikke denne prosessen. Beholdt for Docker/dev som vil treffe
 * Hono direkte på :3001.
 */
const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port });
console.info(`[api] http://localhost:${port} (valgfri lokal prosess — web eier rutene)`);
