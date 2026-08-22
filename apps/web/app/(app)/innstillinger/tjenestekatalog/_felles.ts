/**
 * F2-05 / F5-04 — Små regler tjenestekatalogen deler.
 *
 * Ligger her og ikke i `kunder/_delt.tsx` fordi de handler om PRISSETTING, som
 * bare denne flaten gjør. Visning av en pris (`kroner`) er derimot felles og
 * hentes derfra.
 */

export const TYPE_VALG = [
  { key: 'mc', label: 'MC' },
  { key: 'boat', label: 'Båt' },
  { key: 'atv', label: 'ATV' },
] as const;

export type Kjoretoytype = (typeof TYPE_VALG)[number]['key'];

/**
 * Kroner fra tastaturet → øre i basen.
 *
 * ⛔ **Tom streng er IKKE null-pris — den er «ingen pris satt».** Kolonnen
 * `price_minor` er nullbar med vilje: en tjeneste kan koste «etter medgått tid»
 * eller «på forespørsel». Skrev vi 0 i stedet, ville prislista si at
 * EU-kontrollen er gratis.
 *
 * ⚠️ Komma OG punktum godtas, og mellomrom strippes — «1 450,50» er slik en
 * norsk forhandler faktisk skriver et beløp. Alt annet avvises heller enn å
 * tolkes: `Number('1450kr')` er `NaN`, men `parseFloat('1450kr')` er 1450, og
 * en parser som gjetter er en parser som en dag gjetter feil på en prislapp.
 */
export function parsePris(
  tekst: string,
): { ok: true; ore: number | undefined } | { ok: false; feil: string } {
  const t = tekst.replace(/[\s ]/g, '').replace(',', '.');
  if (!t) return { ok: true, ore: undefined };
  if (!/^\d+(\.\d{1,2})?$/.test(t)) {
    return { ok: false, feil: 'Skriv prisen som tall — for eksempel 1450 eller 1450,50.' };
  }
  return { ok: true, ore: Math.round(Number(t) * 100) };
}

/** Øre → det som skal stå i prisfeltet når man åpner det for redigering. */
export function prisTilFelt(ore: number | null | undefined): string {
  if (ore == null) return '';
  return (ore / 100).toLocaleString('nb-NO', { useGrouping: false });
}

/**
 * Minutter → «1 t 30 min». Varigheten styrer slot-lengden i booking-motoren
 * (F3-01), og 90 minutter er lettere å ta feil av enn halvannen time.
 */
export function visVarighet(minutter: number): string {
  const t = Math.floor(minutter / 60);
  const m = minutter % 60;
  if (!t) return `${m} min`;
  return m ? `${t} t ${m} min` : `${t} t`;
}
