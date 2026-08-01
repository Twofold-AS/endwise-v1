import { createMessagesModule } from '@endwise/modules/messages';
import { publishEvent } from '@endwise/modules/stream';
import type { AgentContext } from './context.ts';

/**
 * F6-05 — Eskalering: agent → menneske, SAMME TRÅD.
 *
 * Broen mellom de to systemene (techstack §3). Når AI-førstelinjen treffer noe
 * den ikke skal svare på, flyttes tråden til et menneske — **kunden starter ikke
 * på nytt.** Meldings-modulen (F6-01) eier tråden; agenten var bare første
 * deltaker i den.
 *
 * Det er hele grunnen til at agenten skriver i `messages` og ikke i en egen
 * «AI-samtale»-tabell. Hadde den hatt sin egen, ville eskalering betydd
 * kopiering — og en kunde som må gjenta seg selv til et menneske, har allerede
 * mistet tilliten til produktet.
 */
export type EscalationReason =
  | 'low_confidence'
  | 'out_of_scope'
  | 'user_requested'
  | 'guardrail'
  | 'error';

export interface EscalationInput {
  reason: EscalationReason;
  /** Hva agenten sist forsto. Blir en systemmelding i tråden. */
  summary: string;
  /** Menneskene som skal inn i tråden (selger, support …). */
  assignTo: string[];
}

const REASON_TEXT: Record<EscalationReason, string> = {
  low_confidence: 'Assistenten var usikker og hentet en kollega',
  out_of_scope: 'Spørsmålet er utenfor det assistenten kan svare på',
  user_requested: 'Kunden ba om å snakke med et menneske',
  guardrail: 'Assistenten stoppet av sikkerhetsgrunner',
  error: 'Assistenten møtte en feil',
};

export class NoThreadError extends Error {
  readonly code = 'NO_THREAD';
  constructor() {
    super('Eskalering krever en tråd — agenten kjørte uten threadId');
  }
}

/**
 * Eskalerer. Tre ting skjer, i denne rekkefølgen:
 *   1. mennesket legges til som deltaker i tråden
 *   2. en systemmelding forklarer HVORFOR (kunden skal se at det skjedde)
 *   3. et event går ut på SSE (F6-02) slik at mennesket ser tråden med én gang
 *
 * Agenten fjernes IKKE fra tråden. Historikken er kontekst for mennesket som
 * overtar — å slette den ville vært å kaste bort det eneste som gjør
 * overleveringen sømløs.
 */
export async function escalateToHuman(
  context: AgentContext,
  input: EscalationInput,
): Promise<void> {
  if (!context.threadId) throw new NoThreadError();

  const messages = createMessagesModule(context.db);
  const threadId = context.threadId;

  // 1 + 2. Samme tråd. Mennesket kommer inn der samtalen allerede er.
  await messages.addParticipants(context.tenantId, threadId, input.assignTo);

  await messages.postSystemMessage({
    tenantId: context.tenantId,
    threadId,
    authorId: `agent:${'kunde-support'}`,
    body: `${REASON_TEXT[input.reason]}.\n\n${input.summary}`,
  });

  // 3. Varsle menneskene — hver for seg, så `audienceId` kan filtrere i SSE.
  for (const participantId of input.assignTo) {
    await publishEvent(context.db, {
      tenantId: context.tenantId,
      audienceId: participantId,
      type: 'thread.escalated',
      subjectId: threadId,
      payload: { threadId, reason: input.reason, summary: input.summary },
    });
  }
}
