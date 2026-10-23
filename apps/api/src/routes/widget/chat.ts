import { type AgentContext, runAgent } from '@endwise/agent-runtime';
import { getAgent } from '@endwise/agents';
import { eq, schema, withTenant } from '@endwise/db';
import { createGuardrails, ScopeGateViolation } from '@endwise/guardrails';
import { writeAiAudit } from '@endwise/modules/audit';
import {
  createRateLimiter,
  type DisclosureLocale,
  WIDGET_AI_DISCLOSURE,
  WIDGET_AI_HANDOVER,
} from '@endwise/modules/widget';
import { resolveModelProvider } from '@endwise/providers';
import type { Context } from 'hono';
import { z } from 'zod';
import { createAppContext } from '../../context.ts';
import { forberedAiMeldinger } from '../../lib/ai-inngang.ts';
import type { WidgetVars } from '../../lib/widget-auth.ts';

/**
 * F4 + F14-04/05/01 — Kundevendt AI-chat i widgeten. Dette er en offentlig flate,
 * så de fire lovpålagte/sikkerhets-egenskapene er ikke valgfrie:
 * 1. Art. 50 (F14-04): opplysningen «du snakker med en AI» returneres som det
 * Første feltet i hvert svar — server-håndhevet, kan ikke fjernes av klienten.
 * 2. Dataregion (F14-02): provider = `resolveModelProvider('customer_freetext')`
 * ⇒ Mistral (EU). `runAgent` dobbeltsjekker via
 * `providerSatisfies`; uten EU-provider i prod kaster resolveren.
 * 3. Scope-gate (F14-05): sensitive kategorier (helse/pii/jus/selvskading) →
 * eskaler til menneske før teksten når AI-en. Moderasjonsfeil blokkerer.
 * 4. Pseudonymisering (F14-01): kundefritekst maskeres før prompt og før
 * moderasjon, unmaskes i svaret.
 */

const chatLimiter = createRateLimiter({ windowMs: 5 * 60_000, max: 20 });

export async function widgetChat(c: Context<{ Variables: WidgetVars }>): Promise<Response> {
  const tenantId = c.get('widgetTenantId');
  const cid = c.get('widgetCid');

  const body = await c.req.json().catch(() => null);
  const parsed = z
    .object({ message: z.string().min(1).max(4000), locale: z.enum(['no', 'en']).optional() })
    .safeParse(body);
  const locale: DisclosureLocale = parsed.success ? (parsed.data.locale ?? 'no') : 'no';
  const disclosure = WIDGET_AI_DISCLOSURE[locale];

  if (!chatLimiter.check(`chat:${cid}`).allowed) {
    return c.json({ disclosure, error: 'For mange meldinger, vent litt' }, 429);
  }
  if (!parsed.success) return c.json({ disclosure, error: 'Ugyldig melding' }, 400);
  const message = parsed.data.message;

  // (2) Provider velges av dataklassen — customer_freetext ⇒ EU. Kaster i prod uten EU.
  let provider: ReturnType<typeof resolveModelProvider>;
  try {
    provider = resolveModelProvider('customer_freetext');
  } catch {
    return c.json(
      {
        disclosure,
        escalated: true,
        reply: 'AI-assistenten er ikke tilgjengelig nå. En medarbeider tar over.',
      },
      503,
    );
  }

  const db = createAppContext().db;

  // (3)+(4) Masker FØR moderasjon. Feiler lukket: moderator-feil → menneske.
  let prepared: Awaited<ReturnType<typeof forberedAiMeldinger>>;
  try {
    prepared = await forberedAiMeldinger({
      db,
      messages: [{ role: 'user', content: message }],
      context: { tenantId, userId: cid, role: 'customer' },
      agent: 'kunde-support',
      cacheKnownNames: true,
    });
  } catch (error) {
    if (!(error instanceof ScopeGateViolation)) {
      console.warn('[widget-moderation] feilet lukket', error);
    }
    return c.json({ disclosure, escalated: true, reply: WIDGET_AI_HANDOVER[locale] });
  }

  const modules = await withTenant(db, tenantId, (tx) =>
    tx
      .select({ key: schema.tenantModules.moduleKey })
      .from(schema.tenantModules)
      .where(eq(schema.tenantModules.enabled, true)),
  ).catch(() => [] as Array<{ key: string }>);

  const context: AgentContext = {
    db,
    tenantId,
    userId: cid,
    role: 'customer',
    entitlements: modules.map((m) => m.key),
    knownCustomerNames: prepared.knownNames,
  };

  const guardrails = createGuardrails({
    onViolation: (v) => {
      console.warn(`[widget-guardrail] ${v.message}`);
      void writeAiAudit(db, {
        tenantId,
        actor: cid,
        action: 'ai.guardrail',
        subjectType: 'agent',
        subjectId: 'kunde-support',
        metadata: { level: v.level, code: v.code },
      });
    },
  });

  let reply = '';
  try {
    await runAgent({
      agent: getAgent('kunde-support'),
      context,
      provider,
      guardrails,
      messages: prepared.messages,
      pseudonymizer: prepared.pseudonymizer,
      onEvent: (e) => {
        if (e.type === 'agent.token') reply += e.text;
        else if (e.type === 'agent.done' && !reply) reply = e.text;
      },
    });
  } catch {
    // Entitlement/region/annen feil → eskaler trygt, ingen intern lekkasje til klient.
    return c.json({
      disclosure,
      escalated: true,
      reply: 'Jeg kan dessverre ikke svare akkurat nå — en medarbeider tar over.',
    });
  }

  return c.json({ disclosure, escalated: false, reply: prepared.pseudonymizer.unmask(reply) });
}
