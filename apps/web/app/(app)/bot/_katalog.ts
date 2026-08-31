export const BOT_TILSTANDER = [
  'sleeping',
  'waking',
  'idle',
  'listening',
  'thinking',
  'searching',
  'working',
  'excited',
  'surprised',
  'suspicious',
  'angry',
  'drowsy',
  'happy',
  'curious',
  'confused',
  'bored',
  'proud',
  'shy',
  'sad',
  'laughing',
  'scared',
  'playful',
  'celebrate',
  'orbit',
  'radar',
  'progress',
  'spawning',
  'humming',
  'loading',
  'dictating',
  'writing',
  'sending',
  'receiving',
  'uploading',
  'notifying',
  'alerting',
  'dragging',
  'bouncing',
  'powering-down',
] as const;

export type BotTilstand = (typeof BOT_TILSTANDER)[number];

export const BOT_MORPHS = [
  'dots',
  'orbit',
  'radar',
  'progress',
  'gather',
  'wave',
  'send',
  'receive',
  'dock',
  'ball',
  'whirl',
  'pencil',
  'bang',
  'standby',
] as const;

export type BotMorph = (typeof BOT_MORPHS)[number];

/** De seks låste Endwise-øyene. Norsk etikett → motor-tilstand. */
export const BOT_HOVED = [
  { oye: 'idle', label: 'idle', tilstand: 'idle' },
  { oye: 'tenker', label: 'tenker', tilstand: 'thinking' },
  { oye: 'lytter', label: 'lytter', tilstand: 'listening' },
  { oye: 'laster', label: 'laster', tilstand: 'loading' },
  { oye: 'feirer', label: 'feirer', tilstand: 'celebrate' },
  { oye: 'alarm', label: 'alarm', tilstand: 'alerting' },
] as const;

export const BOT_STORRELSER = [240, 280, 320] as const;

export const FELT =
  'h-control rounded-control border border-border bg-bg px-2.5 text-body text-fg outline-none focus-visible:border-fg';
