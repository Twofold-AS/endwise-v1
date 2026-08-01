import { type AgentContext, runAgent } from '@endwise/agent-runtime';
import { getAgent } from '@endwise/agents';
import { eq, schema, withTenant } from '@endwise/db';
import {
  createGuardrails,
  createPseudonymizer,
  createScopeGate,
  maskMessages,
  type Moderator,
} from '@endwise/guardrails';
import {
  createRateLimiter,
  type DisclosureLocale,
  WIDGET_AI_DISCLOSURE,
  WIDGET_AI_HANDOVER,
} from '@endwise/modules/widget';
import { createMistralModerator, resolveModelProvider } from '@endwise/providers';
import type { Context } from 'hono';
import { z } from 'zod';
import { createAppContext } from '../../context.ts';
import type { WidgetVars } from '../../lib/widget-auth.ts';

/**
 * F4 + F14-04/05/01 — Kundevendt AI-chat i widgeten. Dette er en OFFENTLIG flate,
 * så de fire lovpålagte/sikkerhets-egenskapene er ikke valgfrie:
 *
 *   1. ART. 50 (F14-04): opplysningen «du snakker med en AI» returneres som det
 *      FØRSTE feltet i HVERT svar — server-håndhevet, kan ikke fjernes av klienten.
 *   2. DATAREGION (F14-02): provider = `resolveModelProvider('customer_freetext')`
 *      ⇒ Mistral (EU), ALDRI Fireworks. `runAgent` dobbeltsjekker via
 *      `providerSatisfies`; uten EU-provider i prod kaster resolveren.
 *   3. SCOPE-GATE (F14-05): sensitive kategorier (helse/pii/jus/selvskading) →
 *      eskaler til menneske FØR teksten når AI-en.
 *   4. PSEUDONYMISERING (F14-01): kundefritekst maskeres før prompt, unmaskes i svaret.
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
      { disclosure, escalated: true, reply: 'AI-assistenten er ikke tilgjengelig nå. En medarbeider tar over.' },
      503,
    );
  }

  // (3) Scope-gate FØR AI. Ekte moderasjon når Mistral er konfigurert (EU); ellers
  //     audit-modus (dev uten nøkkel) — permissiv, men da kjører uansett mock-provider.
  const mistralConfigured = Boolean(process.env.MISTRAL_API_KEY);
  // Fallback-moderator (dev uten Mistral-nøkkel): må matche `Moderator`-typen
  // eksakt — `categories` er et OBJEKT (Partial<Record<..., boolean>>), ikke en array.
  const noopModerator: Moderator = async (_text) => ({ categories: {} });
  const moderate: Moderator = mistralConfigured ? createMistralModerator() : noopModerator;
  const gate = createScopeGate({ moderate, mode: mistralConfigured ? 'escalate' : 'audit' });
  // GuardContext = { tenantId, userId, role } — kundeøkten er en «customer».
  const scope = await gate
    .check(message, { tenantId, userId: cid, role: 'customer' })
    .catch(() => ({ allowed: true, triggered: [] as never[] }));
  if (!scope.allowed) {
    return c.json({ disclosure, escalated: true, reply: WIDGET_AI_HANDOVER[locale] });
  }

  // Entitlements fra DB (ikke klient). RLS-scopet.
  const db = createAppContext().db;
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
  };

  // (4) Pseudonymiser fritekst før prompt; unmask i svaret.
  const pseudo = createPseudonymizer();
  const masked = maskMessages([{ role: 'user', content: message }], pseudo);
  const guardrails = createGuardrails({
    onViolation: (v) => console.warn(`[widget-guardrail] ${v.message}`),
  });

  let reply = '';
  try {
    await runAgent({
      agent: getAgent('kunde-support'),
      context,
      provider,
      guardrails,
      messages: masked,
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

  return c.json({ disclosure, escalated: false, reply: pseudo.unmask(reply) });
}
