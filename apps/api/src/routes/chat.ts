import { streamAgentChat } from '@endwise/agent-runtime';
import { getAgent, UnknownAgentError } from '@endwise/agents';
import { TwoFactorRequiredError } from '@endwise/auth';
import { eq, schema, withTenant } from '@endwise/db';
import { createGuardrails } from '@endwise/guardrails';
import { DataRegionViolation, resolveModelProvider } from '@endwise/providers';
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  type UIMessage,
} from 'ai';
import { Hono } from 'hono';
import { z } from 'zod';
import { createRequestContext } from '../context.ts';

/**
 * F6-18 — STRØMMENDE CHAT-ENDEPUNKT for `useChat`.
 *
 * ── ⚠️ Hvorfor denne ligger i apps/api og ikke som en Next route handler ──
 * Oppgaven sa «route handler». Den ligger likevel her, og grunnen er
 * arkitektonisk, ikke en preferanse: **`apps/web` har med vilje ingen
 * databasetilgang** (se `docs/arkitektur.md`). Alt som rører data går gjennom
 * `apps/api`. En chat-rute i web ville trengt DB, Better-Auth-sesjonen OG
 * agent-runtimen — altså nøyaktig det laget vi har holdt ute av web for å ha
 * ETT sted å sikre dataene.
 *
 * For nettleseren er forskjellen null: `/chat/*` rewrites til apps/api i
 * `next.config.ts`, samme grep som `/trpc/*` og `/api/auth/*`. `useChat` peker
 * på `/chat/<agent>` og ser en same-origin-adresse.
 *
 * ⚠️ Når `apps/api` porteres inn i Next (F13-03), flytter denne med resten —
 * og da BLIR den en route handler, uten at klienten merker noe.
 *
 * ── ⛔ Ingen Vercel AI Gateway ───────────────────────────────────────────
 * Modellen kommer fra `resolveModelProvider(agent.dataClass)`. For AI-diagnose
 * betyr det Mistral (EU), fordi agenten er `customer_freetext` — håndhevet i
 * `streamAgentChat()`, som kaster `DataRegionViolation` hvis noen skulle klare å
 * sende den et annet sted.
 *
 * ── Sperrene, i rekkefølge ───────────────────────────────────────────────
 *   1. sesjon      — Better-Auth. Uten bruker: 401.
 *   2. tenant      — aktiv organisasjon + medlemskap (assertMember). Uten: 403.
 *   3. modul       — agentens `requiredModule` mot `tenant_modules` (F0-04/16).
 *   4. dataregion  — i runtimen. 5. guardrails L1–L5. 6. RLS i basen.
 */
export const chat = new Hono();

const kropp = z.object({
  /** UI-meldingene fra `useChat`. Konverteres til ModelMessages her. */
  messages: z.array(z.custom<UIMessage>()).min(1),
  /** Saken agenten eventuelt skal skrive i. Valideres av verktøyet, ikke her. */
  threadId: z.uuid().optional(),
});

chat.post('/:agent', async (c) => {
  // ── 1. Sesjon + tenant ────────────────────────────────────────────────
  // ⛔ F1-11: mangler 2FA, kastes det her — og da skal det IKKE se ut som en
  // vanlig 401. Egen kode, så klienten kan sende brukeren til oppsett.
  let ctx: Awaited<ReturnType<typeof createRequestContext>>;
  try {
    ctx = await createRequestContext(c.req.raw.headers);
  } catch (error) {
    if (error instanceof TwoFactorRequiredError) {
      return c.json({ error: error.message, kode: error.code }, 403);
    }
    throw error;
  }
  if (!ctx.userId) return c.json({ error: 'Ikke innlogget' }, 401);
  if (!ctx.tenantId || !ctx.role) return c.json({ error: 'Ingen aktiv forhandler' }, 403);

  let agent: ReturnType<typeof getAgent>;
  try {
    agent = getAgent(c.req.param('agent'));
  } catch (error) {
    if (error instanceof UnknownAgentError) return c.json({ error: error.message }, 404);
    throw error;
  }

  const parsed = kropp.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Ugyldig forespørsel' }, 400);

  // ── 3. Modul-gaten (F0-16) ────────────────────────────────────────────
  // Entitlements leses fra DATABASEN, aldri fra klienten. Samme kilde som
  // `agent.run` i tRPC-ruteren bruker.
  const moduler = await withTenant(ctx.db, ctx.tenantId, (tx) =>
    tx
      .select({ key: schema.tenantModules.moduleKey })
      .from(schema.tenantModules)
      .where(eq(schema.tenantModules.enabled, true)),
  ).catch(() => [] as Array<{ key: string }>);
  const entitlements = moduler.map((m) => m.key);

  if (agent.requiredModule && !entitlements.includes(agent.requiredModule)) {
    return c.json(
      { error: `Forhandleren har ikke modulen «${agent.requiredModule}»`, kode: 'MODULE_REQUIRED' },
      403,
    );
  }

  const guardrails = createGuardrails({
    onViolation: (violation) => {
      // TODO(F0-14): til Sentry + audit-loggen (F1-06). Samme TODO som i agent.ts.
      console.warn(`[guardrail:${agent.name}] ${violation.message}`);
    },
  });

  try {
    const result = streamAgentChat({
      agent,
      context: {
        db: ctx.db,
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        role: ctx.role,
        threadId: parsed.data.threadId,
        entitlements,
      },
      provider: resolveModelProvider(agent.dataClass),
      guardrails,
      messages: await convertToModelMessages(parsed.data.messages),
      onViolation: (message) => console.warn(`[guardrail:${agent.name}] ${message}`),
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream }),
    });
  } catch (error) {
    // ⚠️ En regionsbrudd skal ikke se ut som en tilfeldig 500 i loggen. Det er
    // den ene feilen her som er et personvernproblem, ikke en driftsfeil.
    if (error instanceof DataRegionViolation) {
      console.error(`[dataregion] ${error.message}`);
      return c.json(
        { error: 'Agenten kan ikke kjøre med gjeldende oppsett', kode: error.code },
        500,
      );
    }
    throw error;
  }
});
