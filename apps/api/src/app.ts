import { createAuth, TwoFactorRequiredError } from '@endwise/auth';
import { TRPCError } from '@trpc/server';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { createRequestContext } from './context.ts';
import { chat } from './routes/chat.ts';
import { cronCleanup } from './routes/cron/cleanup.ts';
import { cronQuickPull } from './routes/cron/quick-pull.ts';
import { cronRetention } from './routes/cron/retention.ts';
import { health } from './routes/health.ts';
import { invitasjon } from './routes/invitasjon.ts';
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
// F6-18 — strømmende AI-chat for `useChat`. Sesjonsbasert, tenant-scopet,
// modell valgt av agentens dataklasse. ⛔ Ikke Vercel AI Gateway.
app.route('/chat', chat);
// F1-10 — OFFENTLIG invitasjonsflate. Ingen sesjon: den som åpner lenka har
// ingen konto ennå. Hemmeligheten ligger i tokenet, ikke i en cookie.
// ⚠️ FLERTALL med vilje: SIDEN ligger på /invitasjon/[token] i Next. Delte de
// sti, ville Next servert HTML der klienten venter JSON.
app.route('/invitasjoner', invitasjon);

// Interne flater (tRPC v11) — montert på Hono via fetch-adapteret
app.all('/trpc/*', (c) =>
  fetchRequestHandler({
    endpoint: '/trpc',
    req: c.req.raw,
    router: appRouter,
    /**
     * ⛔ F1-11 — `TwoFactorRequiredError` oversettes til en EGEN feilkode, ikke
     * til 401. Forskjellen betyr noe for brukeren: 401 sender hen til
     * innloggingsskjermen hen nettopp kom fra (og der virker passordet, så
     * løkka går rundt), mens `TWO_FACTOR_REQUIRED` forteller klienten at det er
     * OPPSETT som mangler. Uten dette skillet ville tvungen enrollment blitt en
     * uendelig innloggingsløkke uten forklaring.
     */
    createContext: async () => {
      try {
        return await createRequestContext(c.req.raw.headers);
      } catch (error) {
        if (error instanceof TwoFactorRequiredError) {
          throw new TRPCError({ code: 'FORBIDDEN', message: error.code, cause: error });
        }
        throw error;
      }
    },
  }),
);

export { app };
export default app;
