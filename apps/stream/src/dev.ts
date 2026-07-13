import { serve } from '@hono/node-server';
import app from './app.ts';

const port = Number(process.env.PORT ?? 3002);
serve({ fetch: app.fetch, port });
console.info(`[stream] http://localhost:${port}`);
