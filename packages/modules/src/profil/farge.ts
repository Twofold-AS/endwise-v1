/**
 * Ansattfarge. Én palett, overalt.
 * Identiteten er en `ColorId` fra bloub `skins.ts` COLORS — ikke hue-grader
 * 0–359, og ikke en fri fargevelger. Samme id farger avataren, timeplan-klossen,
 * jobb-kortet og tilordnignschipen.
 * Speilet tre steder med vilje (samme mønster som `AVATAR_FORMER`):
 * her (zod + tildeling), `@endwise/ui` (`bloub-farge.ts`) og sjekken i
 * `user_preferences.avatar_color`. Driver de fra hverandre, blir det en hard
 * feil ved skriving.
 */

export const BLOUB_FARGE_IDER = [
  'encre',
  'brun',
  'rouge',
  'orange',
  'ambre',
  'vert',
  'turquoise',
  'bleu',
  'violet',
  'rose',
  'gris',
  'creme',
] as const;

export type BloubFargeId = (typeof BLOUB_FARGE_IDER)[number];

export function erBloubFarge(v: unknown): v is BloubFargeId {
  return typeof v === 'string' && (BLOUB_FARGE_IDER as readonly string[]).includes(v);
}

/**
 * Neste ledige palettfarge i forhandleren. Når alle 12 er i bruk, sykler vi.
 * Rekkefølgen er palettens egen — ikke tilfeldig. To ansettelser på rad skal
 * ikke kunne få samme farge mens det fortsatt finnes ledige.
 */
export function nesteFarge(brukt: readonly string[]): BloubFargeId {
  const tatt = new Set(brukt.filter(erBloubFarge));
  const ledig = BLOUB_FARGE_IDER.find((id) => !tatt.has(id));
  if (ledig) return ledig;
  return BLOUB_FARGE_IDER[brukt.length % BLOUB_FARGE_IDER.length] as BloubFargeId;
}

/**
 * Gammel hue (0–359) → nærmeste av de åtte tidligere velger-stoppene,
 * deretter til paletten. Bare for lesing av leftover-rader før migrering.
 */
export function fargeFraHue(hue: number | null | undefined): BloubFargeId | null {
  if (typeof hue !== 'number' || hue < 0 || hue > 359) return null;
  const stopp: ReadonlyArray<readonly [number, BloubFargeId]> = [
    [20, 'rouge'],
    [60, 'orange'],
    [110, 'ambre'],
    [150, 'vert'],
    [195, 'turquoise'],
    [250, 'bleu'],
    [270, 'violet'],
    [320, 'rose'],
  ];
  let best = stopp[0];
  let dist = 360;
  for (const s of stopp) {
    const d = Math.min(Math.abs(hue - s[0]), 360 - Math.abs(hue - s[0]));
    if (d < dist) {
      dist = d;
      best = s;
    }
  }
  return best[1];
}
