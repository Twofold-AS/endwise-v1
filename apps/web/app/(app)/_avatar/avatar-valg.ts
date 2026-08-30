/**
 * Valgene AvatarVelger kan persistere. Bare farge (hue) styres her.
 * Form, humør og tone er ute av velgeren. Feltene finnes fortsatt på
 * serveren (gammel data), men de ignoreres i `Avatar` og nullstilles når
 * noen lagrer på nytt. Identitet er seed + ev. farge.
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

export type AvatarVelgerValg = {
  form: string | null;
  humor: string | null;
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

export function erTomAvatarValg(valg: AvatarVelgerValg | null | undefined): boolean {
  if (!valg) return true;
  return valg.farge == null;
}

/**
 * «Ny tilfeldig»: ny farge. Form, humør og tone tømmes — de skal ikke
 * lenger styre ansiktet, og et gammelt lagret valg skal ikke overleve et
 * bevisst trekk.
 */
export function tilfeldigAvatarValg(
  behold?: Partial<Pick<AvatarVelgerValg, 'farge'>>,
): AvatarVelgerValg {
  return {
    form: null,
    humor: null,
    farge: behold?.farge ?? trekk(FARGER).grader,
    tone: null,
  };
}

/**
 * Opprett-sti: uten farge får brukeren en tilfeldig hue. Form/humør/tone
 * nullstilles alltid — leftover fra før denne endringen skal ikke persisteres
 * videre som om de fortsatt gjaldt.
 */
export function fullforAvatarValg(valg: AvatarVelgerValg | null | undefined): AvatarVelgerValg {
  if (!valg || erTomAvatarValg(valg)) return tilfeldigAvatarValg();
  return {
    form: null,
    humor: null,
    farge: valg.farge,
    tone: null,
  };
}
