import { TILLATELSE_NIVA, TILLATELSE_OMRADER } from '@endwise/db';

/**
 * F23 / white label F6a — tillatelser per område.
 * Daglig leder og Endwise-admin kan gi. Ingen kan endre egne.
 * «Ansatte: Endre» gir ikke rett til å dele ut.
 */

export const OMRADER = TILLATELSE_OMRADER;
export const NIVA = TILLATELSE_NIVA;

export type Omrade = (typeof OMRADER)[number];
export type Niva = (typeof NIVA)[number];

export const TILLATELSE_FEIL = 'Ikke tillatt';
export const TILLATELSE_HINT = 'Spør daglig leder';

const OMRADER_SETT = new Set<string>(OMRADER);
const NIVA_SETT = new Set<string>(NIVA);

export function erOmrade(v: string): v is Omrade {
  return OMRADER_SETT.has(v);
}

export function erNiva(v: string): v is Niva {
  return NIVA_SETT.has(v);
}

/** Endre omfatter Se. */
export function nivaDekker(har: Niva | null | undefined, trenger: Niva): boolean {
  if (!har) return false;
  if (trenger === 'se') return har === 'se' || har === 'endre';
  return har === 'endre';
}

export function harTillatelse(input: {
  rolle: string | null | undefined;
  omrade: Omrade;
  trenger: Niva;
  gitt: ReadonlyArray<{ omrade: string; niva: string }>;
}): boolean {
  if (input.rolle === 'dealer_admin' || input.rolle === 'endwise_admin') return true;
  if (input.rolle !== 'dealer_staff') return false;
  const treff = input.gitt.find((g) => g.omrade === input.omrade);
  return nivaDekker(treff && erNiva(treff.niva) ? treff.niva : null, input.trenger);
}

export function kanTildele(input: {
  aktorRolle: string | null | undefined;
  aktorId: string;
  malUserId: string;
}): boolean {
  if (input.aktorId === input.malUserId) return false;
  return input.aktorRolle === 'dealer_admin' || input.aktorRolle === 'endwise_admin';
}

export function vurderTildeling(input: {
  aktorRolle: string | null | undefined;
  aktorId: string;
  malUserId: string;
  omrade: string;
  niva: string | null;
}): { ok: true; omrade: Omrade; niva: Niva | null } | { ok: false; grunn: string } {
  if (!kanTildele(input)) return { ok: false, grunn: TILLATELSE_FEIL };
  if (!erOmrade(input.omrade)) return { ok: false, grunn: TILLATELSE_FEIL };
  if (input.niva !== null && !erNiva(input.niva)) return { ok: false, grunn: TILLATELSE_FEIL };
  return { ok: true, omrade: input.omrade, niva: input.niva };
}

/** Kun daglig leder / Endwise — ikke delbart via Ansatte: Endre. */
export const LEDER_HANDLINGER = [
  'tillatelser.dele_ut',
  'ansatte.invitere',
  'ansatte.fjerne',
  'eierskap.overfore',
  'kunde.slette',
  'audit.lese',
] as const;

export function kanLedeHandling(rolle: string | null | undefined): boolean {
  return rolle === 'dealer_admin' || rolle === 'endwise_admin';
}

/**
 * Meny-kosmetikk. `gitt == null` = flagg av / ikke lastet: vis som i dag.
 * Tom liste = lastet, ingen grant: deaktiver.
 */
export function navHarOmrade(input: {
  rolle: string | null | undefined;
  omrade: Omrade;
  trenger?: Niva;
  gitt: ReadonlyArray<{ omrade: string; niva: string }> | null;
}): boolean {
  if (input.gitt == null) return true;
  return harTillatelse({
    rolle: input.rolle,
    omrade: input.omrade,
    trenger: input.trenger ?? 'se',
    gitt: input.gitt,
  });
}
