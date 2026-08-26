import { serve } from '@hono/node-server';
import { Hono } from 'hono';

/**
 * apps/framer-agent — Vercel Container.
 * Grunnen til at denne ikke er en serverless function: Framer External Agent CLI
 * krever shell + filsystem (techstack §2). Selve agenten kobles på i F4/F9.
 */
const app = new Hono();
app.get('/health', (c) => c.json({ ok: true, service: 'framer-agent' }));

const port = Number(process.env.PORT ?? 3003);
serve({ fetch: app.fetch, port });
console.info(`[framer-agent] http://localhost:${port}`);
