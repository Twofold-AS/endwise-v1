import type { ModelMessage } from 'ai';
import {
  brukerTekstFraMelding,
  createPseudonymizer,
  maskMessages,
  type Pseudonymizer,
  type PseudonymizerOptions,
} from './pseudonymize.ts';
import { createScopeGate, type Moderator, type ScopeGateResult } from './scope-gate.ts';
import type { GuardContext } from './types.ts';

export interface PrepareModelMessagesOptions extends PseudonymizerOptions {
  messages: ModelMessage[];
  context: GuardContext;
  /** Scope-gate. Uten moderator hoppes sensitivitetssjekken over (dev/mock). */
  moderate?: Moderator;
  mode?: 'escalate' | 'audit';
  onTrigger?: (result: ScopeGateResult, context: GuardContext) => void;
  /** Allerede opprettet kart — brukes når kallstedet eier unmask. */
  pseudonymizer?: Pseudonymizer;
}

export interface PreparedModelMessages {
  messages: ModelMessage[];
  pseudonymizer: Pseudonymizer;
}

/**
 * Dataminimering + art. 9-vakt, i den rekkefølgen.
 * 1. Masker identifikatorer (navn, fnr, e-post, tlf, regnr).
 * 2. Kjør moderasjon på den *maskerte* teksten — ellers ser
 *    moderasjonsmodellen fødselsnummeret vi nettopp skulle skjule.
 * Feiler lukket: moderator-feil kastes, den svelges ikke til «allowed».
 */
export async function prepareModelMessages(
  options: PrepareModelMessagesOptions,
): Promise<PreparedModelMessages> {
  const pseudonymizer =
    options.pseudonymizer ?? createPseudonymizer({ knownNames: options.knownNames });
  const messages = maskMessages(options.messages, pseudonymizer);

  if (options.moderate) {
    const gate = createScopeGate({
      moderate: options.moderate,
      mode: options.mode ?? 'escalate',
      onTrigger: options.onTrigger,
    });
    for (const message of messages) {
      const tekst = brukerTekstFraMelding(message);
      if (tekst) await gate.assert(tekst, options.context);
    }
  }

  return { messages, pseudonymizer };
}
