import { type Database, schema, withTenant } from '@endwise/db';
import {
  type GuardContext,
  type Moderator,
  type Pseudonymizer,
  prepareModelMessages,
  type ScopeGateResult,
} from '@endwise/guardrails';
import { writeAiAudit } from '@endwise/modules/audit';
import { createMistralModerator } from '@endwise/providers';
import type { ModelMessage } from 'ai';

export const AI_HANDOVER_NO = 'Meldingen ble stoppet. En medarbeider må ta over samtalen.';

const MAX_KJENTE_NAVN = 200;

export function createConfiguredModerator(): Moderator | undefined {
  return process.env.MISTRAL_API_KEY ? createMistralModerator() : undefined;
}

/** Kundenavn fra tenant — til [NAVN_n] før prompt og i verktøyresultater. */
export async function hentKjenteKundenavn(db: Database, tenantId: string): Promise<string[]> {
  const rader = await withTenant(db, tenantId, (tx) =>
    tx.select({ navn: schema.customers.name }).from(schema.customers).limit(MAX_KJENTE_NAVN),
  ).catch((error) => {
    console.error('[ai-inngang] hentKjenteKundenavn feilet');
    if (error instanceof Error) console.error(`[ai-inngang] ${error.name}`);
    return [] as Array<{ navn: string | null }>;
  });
  return rader.map((rad) => rad.navn?.trim() ?? '').filter((navn) => navn.length >= 2);
}

export async function forberedAiMeldinger(options: {
  db: Database;
  messages: ModelMessage[];
  context: GuardContext;
  agent: string;
  knownNames?: readonly string[];
  pseudonymizer?: Pseudonymizer;
}): Promise<{ messages: ModelMessage[]; pseudonymizer: Pseudonymizer; knownNames: string[] }> {
  const knownNames = options.knownNames
    ? [...options.knownNames]
    : await hentKjenteKundenavn(options.db, options.context.tenantId);
  const moderate = createConfiguredModerator();
  const prepared = await prepareModelMessages({
    messages: options.messages,
    context: options.context,
    knownNames,
    pseudonymizer: options.pseudonymizer,
    moderate,
    mode: moderate ? 'escalate' : 'audit',
    onTrigger: (result: ScopeGateResult) => {
      void writeAiAudit(options.db, {
        tenantId: options.context.tenantId,
        actor: options.context.userId,
        action: 'ai.scope_gate',
        subjectType: 'agent',
        subjectId: options.agent,
        metadata: { triggered: result.triggered, allowed: result.allowed },
      });
    },
  });
  return { ...prepared, knownNames };
}
