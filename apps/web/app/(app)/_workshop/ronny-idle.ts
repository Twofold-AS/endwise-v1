import type { ExpressionId } from '@endwise/ui/bloub/BloubBot';

export const IDLE_MS = 5000;

/**
 * Chrome-Ronny: kun uttrykk. wink er StateId (ett øye), ikke ExpressionId.
 * Ingen colere / sinte blikk. Ingen thinking/alert/notify.
 */
export type RonnyAnsikt = ExpressionId | 'wink';

export const RONNY_IDLE: readonly RonnyAnsikt[] = ['curieux', 'heureux', 'wink', 'surpris'];

/** Samme sett på telefon — aldri sint. */
export const RONNY_PHONE_IDLE: readonly RonnyAnsikt[] = ['curieux', 'heureux', 'wink', 'surpris'];

export function erRonnyWink(ansikt: RonnyAnsikt): ansikt is 'wink' {
  return ansikt === 'wink';
}
