import { createAuth } from '@endwise/auth';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { createRequestContext } from './context.ts';
import { cronCleanup } from './routes/cron/cleanup.ts';
import { cronQuickPull } from './routes/cron/quick-pull.ts';
import { cronRetention } from './routes/cron/retention.ts';
import { health } from './routes/health.ts';
import { stripeWebhook } from './routes/stripe-webhook.ts';
import { widget } from './routes/widget/index.ts';
import { appRouter } from './trpc/router.ts';

const app = new Hono();

app.use('*', logger());
app.use('*', secureHeaders());

// F1-01/F1-03 — Better-Auth eier hele /api/auth/*-flaten (sign-in, OTP, 2FA, passkey).
// Lat initialisering: env-variablene skal ikke kreves ved import (build/test).
let authInstance: ReturnType<typeof createAuth> | undefined;
const getAuth = () => {
  authInstance ??= createAuth();
  return authInstance;
};
app.on(['GET', 'POST'], '/api/auth/*', (c) => getAuth().handler(c.req.raw));

// Offentlig REST (Hono)
app.route('/health', health);
// F5-09 — Stripe abonnement-webhook (signaturverifisert).
app.route('/stripe/webhook', stripeWebhook);
app.route('/cron/cleanup', cronCleanup);
// F14-03: automatisk sletting etter retensjonspolicyen.
app.route('/cron/retention', cronRetention);
// F8-01: planlagt Quick-pull 08:00/16:00 Oslo (DST-guard i handleren).
app.route('/cron/quick-pull', cronQuickPull);
// F4: OFFENTLIG kundewidget (publishable key + origin + kortlevd token, ikke sesjon).
app.route('/widget', widget);

// Interne flater (tRPC v11) — montert på Hono via fetch-adapteret
app.all('/trpc/*', (c) =>
  fetchRequestHandler({
    endpoint: '/trpc',
    req: c.req.raw,
    router: appRouter,
    createContext: () => createRequestContext(c.req.raw.headers),
  }),
);

export { app };
export default app;
