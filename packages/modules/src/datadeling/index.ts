/** F36 / white label F13 — datadeling uten UI (F14-07). */

export const DELING_OMFANG = ['bilder_ai_tagger', 'delekatalog'] as const;
export type DelingOmfang = (typeof DELING_OMFANG)[number];

export const DELING_RETENSJON_DAGER = 30;

export function harAktivtSamtykke(avtale: {
  delingSamtykke: boolean;
  signertAt: Date | null;
  trukketTilbakeAt: Date | null;
}): boolean {
  return avtale.delingSamtykke && avtale.signertAt != null && avtale.trukketTilbakeAt == null;
}

export function modellNokkelErTrygg(nokkel: string): boolean {
  return !/(regnr|vin|kunde)/i.test(nokkel);
}
