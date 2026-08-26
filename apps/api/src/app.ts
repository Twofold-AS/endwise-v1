import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { handleAuth } from './http/auth.ts';
import { handleHealth } from './http/health.ts';
import { handleStripeWebhook } from './http/stripe-webhook.ts';
import { handleTrpc } from './http/trpc.ts';
import { chat } from './routes/chat.ts';
import { cronCleanup } from './routes/cron/cleanup.ts';
import { cronQuickPull } from './routes/cron/quick-pull.ts';
import { cronRetention } from './routes/cron/retention.ts';
import { invitasjon } from './routes/invitasjon.ts';
import { widget } from './routes/widget/index.ts';

/**
 * Hono-skallet. Eies av `apps/api` som bibliotek.
 * Vercel bruker ikke `serve` herfra. Next.js route handlers i
 * `apps/web` kaller `handleTrpc` / `handleAuth` / `handleStripeWebhook` /
 * `handleHono` direkte. Dette skallet er den tynne lokale stien
 * (`src/dev.ts` + Docker) og implementasjonen bak `handleHono`.
 */
const app = new Hono();

app.use('*', logger());
app.use('*', secureHeaders());

// F1-01/F1-03 — Better-Auth eier hele /api/auth/*-flaten (sign-in, OTP, 2FA, passkey).
app.on(['GET', 'POST'], '/api/auth/*', (c) => handleAuth(c.req.raw));

app.get('/health', () => handleHealth());
app.get('/health/', () => handleHealth());

// Stripe abonnement-webhook (signaturverifisert, rå body).
app.post('/stripe/webhook', (c) => handleStripeWebhook(c.req.raw));

app.route('/cron/cleanup', cronCleanup);
// Automatisk sletting etter retensjonspolicyen.
app.route('/cron/retention', cronRetention);
// Planlagt Quick-pull 08:00/16:00 Oslo (dst-guard i handleren).
app.route('/cron/quick-pull', cronQuickPull);
// F4: offentlig kundewidget (publishable key + origin + kortlevd token, ikke sesjon).
app.route('/widget', widget);
// Strømmende AI-chat for `useChat`. Sesjonsbasert, tenant-scopet,
// modell valgt av agentens dataklasse. Ikke Vercel AI Gateway.
app.route('/chat', chat);
// Offentlig invitasjonsflate. Ingen sesjon: den som åpner lenka har
// ingen konto ennå. Hemmeligheten ligger i tokenet, ikke i en cookie.
// Flertall med vilje: siden ligger på /invitasjon/[token] i Next. Delte de
// sti, ville Next servert HTML der klienten venter JSON.
app.route('/invitasjoner', invitasjon);

// Interne flater (tRPC v11) — Web fetch-adapter, samme handler som Next.
app.all('/trpc/*', (c) => handleTrpc(c.req.raw));

export { app };
export default app;
