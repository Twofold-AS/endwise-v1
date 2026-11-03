export const KUNDE_MELDING_MAKS = 2000;
export const KUNDE_MELDING_PER_MINUTT = 10;

export function rensKundeMelding(tekst: string): string {
  const t = tekst.replace(/\r\n/g, '\n').trim();
  if (!t) throw new Error('Skriv en melding først');
  if (t.length > KUNDE_MELDING_MAKS) {
    throw new Error(`Meldingen kan være maks ${KUNDE_MELDING_MAKS} tegn`);
  }
  return t;
}
