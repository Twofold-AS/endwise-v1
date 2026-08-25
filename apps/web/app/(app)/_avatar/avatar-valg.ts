/**
 * F6-19 — Valgene AvatarVelger kan persistere. Speiler serverens
 * `AVATAR_FORMER` / `AVATAR_HUMOR` (zod + CHECK).
 *
 * Identitet er form + farge + seed. Humør er det brukeren valgte — «Ny
 * tilfeldig» rører ikke et valgt humør eller en valgt farge. Opprett uten
 * valg trekker blant de ti kuraterte humørene, aldri et fast happy.
 *
 * ⛔ `sad` / `mad` / `sick` / `scared` finnes i blobatar, men er ikke i
 * vokabularet vi lagrer. Status-visningen mapper mot happy/thinking/idle.
 */

export const FORMER = [
  'round',
  'organic',
  'boxy',
  'capsule',
  'nub',
  'cloud',
  'droplet',
  'hexagon',
  'sun',
  'triangle',
] as const;

export const HUMOR = [
  { key: 'idle', label: 'Nøytral' },
  { key: 'happy', label: 'Blid' },
  { key: 'wink', label: 'Blunk' },
  { key: 'smug', label: 'Selvtilfreds' },
  { key: 'sleepy', label: 'Trøtt' },
  { key: 'thinking', label: 'Tenker' },
  { key: 'surprised', label: 'Overrasket' },
  { key: 'unsure', label: 'Usikker' },
  { key: 'love', label: 'Forelsket' },
  { key: 'shy', label: 'Sjenert' },
] as const;

/**
 * Åtte punkter rundt fargesirkelen. Siste to er 270 (lilla) og 320 (rosa) —
 * 300/340 lå for tett på magenta/rosa og leste som to varianter av det samme.
 * 320 er blobatars dokumenterte ende («hue stops … to 320»).
 */
export const FARGER = [
  { grader: 20, label: 'Rød' },
  { grader: 60, label: 'Oransje' },
  { grader: 110, label: 'Gul' },
  { grader: 150, label: 'Grønn' },
  { grader: 195, label: 'Turkis' },
  { grader: 250, label: 'Blå' },
  { grader: 270, label: 'Lilla' },
  { grader: 320, label: 'Rosa' },
] as const;

/** De seks svatsjene, i bibliotekets rekkefølge (`TONES` i `color.ts`). */
export const TONER = ['Pastell', 'Blek', 'Mid', 'Dyp', 'Lys', 'Blekk'] as const;

export type AvatarVelgerValg = {
  form: (typeof FORMER)[number] | null;
  humor: (typeof HUMOR)[number]['key'] | null;
  farge: number | null;
  tone: number | null;
};

export const TOM_AVATAR_VALG: AvatarVelgerValg = {
  form: null,
  humor: null,
  farge: null,
  tone: null,
};

function trekk<T>(liste: readonly T[]): T {
  return liste[Math.floor(Math.random() * liste.length)] as T;
}

export function tilfeldigHumor(): AvatarVelgerValg['humor'] {
  return trekk(HUMOR).key;
}

export function erTomAvatarValg(valg: AvatarVelgerValg | null | undefined): boolean {
  if (!valg) return true;
  return valg.form == null && valg.humor == null && valg.farge == null && valg.tone == null;
}

/**
 * «Ny tilfeldig» / ny avatar: ny form (og tone om den ikke er valgt).
 * Valgt humør og farge beholdes. Uten valg trekkes humør blant alle ti —
 * aldri hardkodet happy.
 */
export function tilfeldigAvatarValg(
  behold?: Partial<Pick<AvatarVelgerValg, 'humor' | 'farge' | 'tone'>>,
): AvatarVelgerValg {
  return {
    form: trekk(FORMER),
    humor: behold?.humor ?? tilfeldigHumor(),
    farge: behold?.farge ?? trekk(FARGER).grader,
    tone: behold?.tone ?? Math.floor(Math.random() * TONER.length),
  };
}

/**
 * Opprett-sti: tom avatar får et tilfeldig valg (humør blant de ti).
 * Delvis utfylt uten humør får et tilfeldig humør — resten røres ikke.
 */
export function fullforAvatarValg(valg: AvatarVelgerValg | null | undefined): AvatarVelgerValg {
  if (!valg || erTomAvatarValg(valg)) return tilfeldigAvatarValg();
  if (valg.humor == null) return { ...valg, humor: tilfeldigHumor() };
  return valg;
}
