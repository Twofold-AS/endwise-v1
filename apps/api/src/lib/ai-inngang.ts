import type { Database } from '@endwise/db';
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

export function createConfiguredModerator(): Moderator | undefined {
  return process.env.MISTRAL_API_KEY ? createMistralModerator() : undefined;
}

export async function forberedAiMeldinger(options: {
  db: Database;
  messages: ModelMessage[];
  context: GuardContext;
  agent: string;
  knownNames?: readonly string[];
  pseudonymizer?: Pseudonymizer;
}): Promise<{ messages: ModelMessage[]; pseudonymizer: Pseudonymizer }> {
  const moderate = createConfiguredModerator();
  return prepareModelMessages({
    messages: options.messages,
    context: options.context,
    knownNames: options.knownNames,
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
      }).catch(() => undefined);
    },
  });
}
