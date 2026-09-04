import {
  AgentPreflightRefuse,
  streamAgentChat,
  UgyldigToolNavnError,
} from '@endwise/agent-runtime';
import { getAgent, pakkSideSomData, UnknownAgentError, vurderRonnyInn } from '@endwise/agents';
import { TwoFactorRequiredError } from '@endwise/auth';
import { eq, schema, withTenant } from '@endwise/db';
import { createGuardrails } from '@endwise/guardrails';
import {
  DataRegionViolation,
  MissingEuProviderError,
  ModelNotConfiguredError,
  resolveModelProvider,
} from '@endwise/providers';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  toUIMessageStream,
  type UIMessage,
} from 'ai';
import { Hono } from 'hono';
import { z } from 'zod';
import { createRequestContext } from '../context.ts';

/**
 * Strømmende chat-endepunkt for `useChat`.
 * Servert som Next route handler, logikken bor her
 * `apps/web/app/chat/[agent]/route.ts` kaller `handleHono` → denne flaten.
 * Klienten (`useChat` / `DefaultChatTransport`) peker på `/chat/<agent>`
 * same-origin. Biblioteket (`@endwise/api`) eier DB, sesjon og agent-runtime
 * UI-et i web rører fortsatt ikke dataene direkte.
 * Ingen Vercel AI Gateway
 * Modellen kommer fra `resolveModelProvider(agent.dataClass)`. Begge
 * dataklasser rutes til Mistral EU (Mikael 02.09.2026) — Ronny/workshop
 * (`tenant_operational`) og AI-diagnose/kunde (`customer_freetext`).
 * `streamAgentChat` kaster `DataRegionViolation` hvis `customer_freetext`
 * likevel sendes mot en ikke-EU-leverandør.
 * Sperrene, i rekkefølge
 * 1. sesjon — Better-Auth. Uten bruker: 401.
 * 2. tenant — aktiv organisasjon + medlemskap (assertMember). Uten: 403.
 * 3. modul — agentens `requiredModule` mot `tenant_modules` (F0-04/16).
 * 4. dataregion — i runtimen. 5. guardrails L1–L5. 6. RLS i basen.
 */
function ronnyNektRespons(tekst: string) {
  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      execute({ writer }) {
        writer.write({ type: 'text-start', id: 'ronny-lock' });
        writer.write({ type: 'text-delta', id: 'ronny-lock', delta: tekst });
        writer.write({ type: 'text-end', id: 'ronny-lock' });
      },
    }),
  });
}

export const chat = new Hono();

const kropp = z.object({
  /** UI-meldingene fra `useChat`. Konverteres til ModelMessages her. */
  messages: z.array(z.custom<UIMessage>()).min(1),
  /** Saken agenten eventuelt skal skrive i. Valideres av verktøyet, ikke her. */
  threadId: z.uuid().optional(),
  /** Hvilken side brukeren står på. Workshop-agenten får dette hver tur. */
  side: z
    .object({
      pathname: z.string().max(200),
      tittel: z.string().max(120),
      merkelapp: z.string().max(40),
    })
    .optional(),
});

chat.post('/:agent', async (c) => {
  // 1. Sesjon + tenant
  // Mangler 2FA, kastes det her — og da skal det ikke se ut som en
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

  // 3. Modul-gaten (F0-16)
  // Entitlements leses fra databasen, aldri fra klienten. Samme kilde som
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
    const modelMessages = (await convertToModelMessages(parsed.data.messages)).filter(
      (melding) => melding.role !== 'system',
    );

    // L1 på chat-inngangen. streamAgentChat er synkron og kaller ikke
    // filterInput selv — samme sperre som runAgent, bare her.
    const messages = await guardrails.filterInput(modelMessages, {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    });

    // Ronny: nekt utenom-tema og jailbreak FØR Mistral. Modellen skal
    // ikke få sjansen til å lyde «ignore previous instructions».
    if (agent.name === 'workshop') {
      const nekt = vurderRonnyInn(modelMessages);
      if (nekt) {
        return ronnyNektRespons(nekt);
      }
    }

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
      messages,
      systemExtra: parsed.data.side ? pakkSideSomData(parsed.data.side) : undefined,
      onViolation: (message) => console.warn(`[guardrail:${agent.name}] ${message}`),
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream }),
    });
  } catch (error) {
    // En regionsbrudd skal ikke se ut som en tilfeldig 500 i loggen. Det er
    // den ene feilen her som er et personvernproblem, ikke en driftsfeil.
    if (error instanceof AgentPreflightRefuse) {
      return ronnyNektRespons(error.text);
    }
    if (error instanceof DataRegionViolation) {
      console.error(`[dataregion] ${error.message}`);
      return c.json(
        { error: 'Agenten kan ikke kjøre med gjeldende oppsett', kode: error.code },
        500,
      );
    }
    if (
      error instanceof ModelNotConfiguredError ||
      error instanceof MissingEuProviderError ||
      error instanceof UgyldigToolNavnError
    ) {
      console.error(`[chat] ${error.message}`);
      return c.json({ error: error.message, kode: error.code }, 500);
    }
    throw error;
  }
});
