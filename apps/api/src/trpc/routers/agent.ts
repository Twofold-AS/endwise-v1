import { type AgentContext, createStreamBridge, runAgent } from '@endwise/agent-runtime';
import { getAgent, listAgents } from '@endwise/agents';
import { eq, schema, withTenant } from '@endwise/db';
import { createGuardrails } from '@endwise/guardrails';
import { REQUIRED_REGION, resolveModelProvider } from '@endwise/providers';
import { z } from 'zod';
import { moduleAdminProcedure, moduleProcedure, router } from '../init.ts';

/**
 * Modul-gate: `ai-support`. Agentflaten er et betalt tillegg.
 * Fram til sjekket `assertEntitled` i agent-runtime hvilken agent
 * som fikk kjøre, men ruta var åpen: en forhandler uten modulen kunne kalle
 * `agent.list` og se rutingtabellen, og `agent.run` returnerte først en feil
 * dypt nede i runtime. Nå avvises kallet i døra.
 */
const aiProcedure = moduleProcedure('ai-support');
const aiAdminProcedure = moduleAdminProcedure('ai-support');

/**
 * Å starte en agent.
 * Svaret her er ikke agentens tekst. Tokenene strømmer over SSE (F6-02), på samme
 * kanal som meldingene. Denne mutasjonen sier bare «den er i gang» — klienten
 * lytter allerede.
 */
export const agentRouter = router({
  /**
   * Hva AI-laget faktisk er satt opp som, lest fra kilden.
   * Uten denne ruten måtte UI-et gjentatt rutingregelen (dataklasse → region →
   * leverandør) i en klient-konstant. En sikkerhetsregel som står to steder, er
   * en sikkerhetsregel som før eller siden står ulikt to steder — og da viser
   * skjermen noe annet enn det serveren håndhever.
   * Kun admin: dette er driftsinnsyn (hvilken leverandør, hvilken region,
   * mangler nøkkelen?), ikke noe en hvilken som helst ansatt trenger.
   * Ingen nøkler eller endepunkt-hemmeligheter returneres — bare navn og region.
   */
  list: aiAdminProcedure.query(({ ctx }) =>
    listAgents().map((agent) => {
      const provider = resolveModelProvider(agent.dataClass);
      return {
        name: agent.name,
        role: agent.role,
        maxSteps: agent.maxSteps,
        dataClass: agent.dataClass,
        requiredModule: agent.requiredModule ?? null,
        requiredRegion: REQUIRED_REGION[agent.dataClass],
        provider: provider.name,
        providerRegion: provider.region,
        providerConfigured: provider.isConfigured(),
        // Entitlement-gating (F0-04) avgjøres server-side; klienten viser bare
        // hvorfor en agent eventuelt er grået ut.
        tenantId: ctx.tenantId,
      };
    }),
  ),

  run: aiProcedure
    .input(
      z.object({
        agent: z.string().min(1),
        threadId: z.uuid().optional(),
        message: z.string().min(1).max(4000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const agent = getAgent(input.agent);

      // Entitlements (F0-04) hentes fra DB — ikke fra klienten.
      const modules = await withTenant(ctx.db, ctx.tenantId, (tx) =>
        tx
          .select({ key: schema.tenantModules.moduleKey })
          .from(schema.tenantModules)
          .where(eq(schema.tenantModules.enabled, true)),
      ).catch(() => [] as Array<{ key: string }>);

      const context: AgentContext = {
        db: ctx.db,
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        role: ctx.role,
        threadId: input.threadId,
        entitlements: modules.map((m) => m.key),
      };

      const guardrails = createGuardrails({
        onViolation: (violation) => {
          // TODO(F0-14): til Sentry + audit-loggen (F1-06).
          console.warn(`[guardrail] ${violation.message}`);
        },
      });

      // Workshop/Ronny-gaten sitter på agent-definisjonen (preflight,
      // allowlist, rewriteOutput) — samme sperre som /chat/workshop.
      await runAgent({
        agent,
        context,
        // F14 / Mikael 02.09.2026: resolve ruter begge dataklasser til Mistral EU.
        provider: resolveModelProvider(agent.dataClass),
        guardrails,
        messages: [{ role: 'user', content: input.message }],
        onEvent: createStreamBridge(context),
      });

      return { started: true, agent: agent.name };
    }),
});
