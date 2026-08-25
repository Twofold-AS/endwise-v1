/**
 * F6-19 — Valgene AvatarVelger kan persistere. Speiler serverens
 * `AVATAR_FORMER` / `AVATAR_HUMOR` (zod + CHECK). Humør er låst opp:
 * brukeren velger uttrykk, og «Ny tilfeldig» trekker blant alle ti.
 *
 * ⛔ `sad` / `mad` / `sick` / `scared` finnes i blobatar, men er ikke i
 * vokabularet vi lagrer. Status-visningen mapper mot happy/thinking/sleepy.
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

export const FARGER = [20, 60, 110, 150, 195, 250, 300, 340] as const;

export type AvatarVelgerValg = {
  form: (typeof FORMER)[number] | null;
  humor: (typeof HUMOR)[number]['key'] | null;
  farge: number | null;
  tone: number | null;
};

export function tilfeldigAvatarValg(): AvatarVelgerValg {
  return {
    form: FORMER[Math.floor(Math.random() * FORMER.length)] ?? 'round',
    humor: HUMOR[Math.floor(Math.random() * HUMOR.length)]?.key ?? 'idle',
    farge: FARGER[Math.floor(Math.random() * FARGER.length)] ?? 20,
    tone: Math.floor(Math.random() * 6),
  };
}
