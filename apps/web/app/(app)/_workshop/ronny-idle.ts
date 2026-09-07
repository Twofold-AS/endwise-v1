import type { ExpressionId } from '@endwise/ui/bloub/BloubBot';

export const IDLE_MS = 5000;

export const RONNY_IDLE: readonly ExpressionId[] = [
  'heureux',
  'colere',
  'surpris',
  'hilare',
  'curieux',
  'attentif',
  'excite',
  'fier',
  'mefiant',
  'colere',
  'heureux',
  'colere',
];

/** Telefon-chrome: aldri sint/colere. Store/små øyne, nysgjerrig, glad, mystisk. */
export const RONNY_PHONE_IDLE: readonly ExpressionId[] = [
  'surpris',
  'attentif',
  'curieux',
  'heureux',
  'hilare',
  'mefiant',
  'excite',
  'fier',
  'neutre',
];
