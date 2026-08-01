import { type AgentContext, createStreamBridge, runAgent } from '@endwise/agent-runtime';
import { getAgent } from '@endwise/agents';
import { eq, schema, withTenant } from '@endwise/db';
import { createGuardrails } from '@endwise/guardrails';
import { resolveModelProvider } from '@endwise/providers';
import { z } from 'zod';
import { protectedProcedure, router } from '../init.ts';

/**
 * F6-13 — Å starte en agent.
 *
 * Svaret her er IKKE agentens tekst. Tokenene strømmer over SSE (F6-02), på samme
 * kanal som meldingene. Denne mutasjonen sier bare «den er i gang» — klienten
 * lytter allerede.
 */
export const agentRouter = router({
  run: protectedProcedure
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

      await runAgent({
        agent,
        context,
        // F14: leverandøren velges av AGENTENS DATAKLASSE, ikke av konfig.
        // Kunde-support (customer_freetext) → Mistral (EU). Alltid.
        provider: resolveModelProvider(agent.dataClass),
        guardrails,
        messages: [{ role: 'user', content: input.message }],
        onEvent: createStreamBridge(context),
      });

      return { started: true, agent: agent.name };
    }),
});
