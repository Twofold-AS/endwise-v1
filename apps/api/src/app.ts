import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { createAppContext } from './context.ts';
import { cronCleanup } from './routes/cron/cleanup.ts';
import { health } from './routes/health.ts';
import { appRouter } from './trpc/router.ts';

const app = new Hono();

app.use('*', logger());
app.use('*', secureHeaders());

// Offentlig REST (Hono)
app.route('/health', health);
app.route('/cron/cleanup', cronCleanup);

// Interne flater (tRPC v11) — montert på Hono via fetch-adapteret
app.all('/trpc/*', (c) =>
  fetchRequestHandler({
    endpoint: '/trpc',
    req: c.req.raw,
    router: appRouter,
    createContext: () => createAppContext(),
  }),
);

export { app };
export default app;
