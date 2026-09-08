import {
  DEFAULT_EXPRESSION,
  EXPRESSIONS,
  type ExpressionId,
  SEQUENCE,
  type StateId,
} from '@endwise/ui/bloub/BloubBot';

export type BotTilstand = StateId;
export type BotUttrykk = ExpressionId;

export const BOT_TILSTANDER = SEQUENCE;

export const BOT_UTTRYKK = EXPRESSIONS.map((e) => e.id);

export const BOT_HOVED = [
  { oye: 'idle', label: 'idle', tilstand: 'idle' as const, uttrykk: 'neutre' as const },
  { oye: 'tenker', label: 'tenker', tilstand: 'thinking' as const, uttrykk: 'neutre' as const },
  { oye: 'lytter', label: 'lytter', tilstand: 'idle' as const, uttrykk: 'attentif' as const },
  { oye: 'laster', label: 'laster', tilstand: 'thinking' as const, uttrykk: 'neutre' as const },
  { oye: 'feirer', label: 'feirer', tilstand: 'burst' as const, uttrykk: 'neutre' as const },
  { oye: 'alarm', label: 'alarm', tilstand: 'alert' as const, uttrykk: 'neutre' as const },
  { oye: 'orbit', label: 'orbit', tilstand: 'orbit' as const, uttrykk: 'neutre' as const },
] as const;

export type BotHoved = (typeof BOT_HOVED)[number]['oye'];

export const BOT_STORRELSER = [240, 280, 320] as const;

export const FELT = 'ew-felt ew-felt-md';

export { DEFAULT_EXPRESSION, SEQUENCE };
