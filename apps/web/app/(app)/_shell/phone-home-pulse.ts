import { osloKalenderdag, osloPlusDager, osloStartAvDag } from '../_lib/oslo-dag';
import { sammeKalenderdag } from '../dashboard/_pa-jobb';
import type { PhoneBooking, PhoneTraad } from './phone-home-data';

const PLANLAGT_STATUS = new Set(['draft', 'confirmed']);

export type PhoneDelPulse = {
  name: string;
  reserved: number;
  tilgjengelig: number;
  underMinimum: boolean;
};

export type PulseTeamMedlem = {
  id: string;
  status: string;
  name?: string;
};

export const PULSE_DAGER = 30;

/** Plausibel dag når det ikke finnes jobber i vinduet — uten mock-merke. */
export const PULSE_PLAUSIBEL_IDAG = { planlagt: 3, paagaar: 2, ferdig: 1 };
/** Plausibel innboks uten historikk — uten mock-merke. */
export const PULSE_PLAUSIBEL_INNBOKS_MELDINGER = 7;

/** Bakoverkompatible alias — samme tall, ikke lenger merket mock. */
export const PULSE_MOCK_IDAG = PULSE_PLAUSIBEL_IDAG;
export const PULSE_MOCK_INNBOKS_MELDINGER = PULSE_PLAUSIBEL_INNBOKS_MELDINGER;
export const PULSE_MOCK_MANED = { denne: 18, forrige: 14 };

export function idagTall(jobber: PhoneBooking[], naa: Date) {
  const dagens = jobber.filter(
    (j) => sammeKalenderdag(j.startsAt, naa) && j.status !== 'cancelled',
  );
  return {
    planlagt: dagens.filter((j) => PLANLAGT_STATUS.has(j.status)).length,
    paagaar: dagens.filter((j) => j.status === 'in_progress').length,
    ferdig: dagens.filter((j) => j.status === 'completed').length,
  };
}

/** Deterministisk «tilfeldig» tall — stabilt per seed, ingen hydration-flicker. */
export function plausibelTall(seed: string, min: number, max: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const span = max - min + 1;
  return min + ((h >>> 0) % span);
}

export function plausibelSpark(naa: Date): number[] {
  const base = osloKalenderdag(naa);
  return Array.from({ length: PULSE_DAGER }, (_, i) => plausibelTall(`${base}:spark:${i}`, 1, 5));
}

/** Vindu: i dag minus 29 døgn → i morgen (30 kalenderdager, Oslo). */
export function dagerVindu(naa: Date) {
  const iDag = osloKalenderdag(naa);
  return {
    fra: osloStartAvDag(osloPlusDager(iDag, -(PULSE_DAGER - 1))),
    til: osloStartAvDag(osloPlusDager(iDag, 1)),
  };
}

/** @deprecated Bruk dagerVindu — 30 dager, ikke måned mot forrige. */
export function manedVindu(naa: Date) {
  return dagerVindu(naa);
}

export function osloManedKey(from: Date | string): string {
  return osloKalenderdag(from).slice(0, 7);
}

export function osloStartAvManed(from: Date | string): Date {
  return osloStartAvDag(`${osloManedKey(from)}-01`);
}

export function forrigeManedStart(naa: Date): Date {
  const denne = osloStartAvManed(naa);
  return osloStartAvManed(osloPlusDager(osloKalenderdag(denne), -1));
}

export function siste30dSpark(jobber: PhoneBooking[], naa: Date): number[] {
  const iDag = osloKalenderdag(naa);
  const perDag = new Map<string, number>();
  for (const j of jobber) {
    if (j.status === 'cancelled') continue;
    const dag = osloKalenderdag(j.startsAt);
    perDag.set(dag, (perDag.get(dag) ?? 0) + 1);
  }
  const serie = Array.from({ length: PULSE_DAGER }, (_, i) => {
    const dag = osloPlusDager(iDag, -(PULSE_DAGER - 1 - i));
    return perDag.get(dag) ?? 0;
  });
  if (serie.every((n) => n === 0)) return plausibelSpark(naa);
  return serie;
}

/** Linje-serie — beholdt for eldre tester. */
export function manedSparkVerdier(forrige: number, denne: number): number[] {
  return [Math.max(0, forrige), Math.max(0, denne)];
}

export function manedBookingTall(jobber: PhoneBooking[], naa: Date) {
  const denneKey = osloManedKey(naa);
  const forrigeKey = osloManedKey(forrigeManedStart(naa));
  const aktiv = (j: PhoneBooking) => j.status !== 'cancelled';
  const denne = jobber.filter((j) => aktiv(j) && osloManedKey(j.startsAt) === denneKey).length;
  const forrige = jobber.filter((j) => aktiv(j) && osloManedKey(j.startsAt) === forrigeKey).length;
  if (denne + forrige === 0) return { ...PULSE_MOCK_MANED };
  return { denne, forrige };
}

/** Ingen jobber i vinduet = plausibel dag, uten badge. */
export function idagVisning(jobber: PhoneBooking[], naa: Date) {
  const tall = idagTall(jobber, naa);
  if (jobber.length === 0) return { ...PULSE_PLAUSIBEL_IDAG };
  return tall;
}

/**
 * Innboks-rad: kun meldingstall. Tom historikk = plausibelt tall, uten badge.
 */
export function innboksRad(traader: PhoneTraad[]) {
  const meldinger = traader.reduce((sum, t) => sum + (t.unread ?? 0), 0);
  if (traader.length === 0) {
    return { meldinger: PULSE_PLAUSIBEL_INNBOKS_MELDINGER };
  }
  return { meldinger };
}

/**
 * Deler som venter på bestilling / trenger godkjenning.
 * Godkjenning = under minimum og allerede reservert.
 */
export function lagerRad(deler: PhoneDelPulse[]) {
  const vente = deler.filter((d) => d.underMinimum);
  const godkjenning = vente.filter((d) => d.reserved > 0);
  if (vente.length === 0) {
    return { antall: 0, godkjenning: 0, tittel: 'Venter på bestilling' };
  }
  const tittel =
    godkjenning.length > 0 && godkjenning.length === vente.length
      ? 'Trenger godkjenning'
      : 'Venter på bestilling';
  return { antall: vente.length, godkjenning: godkjenning.length, tittel };
}

/** Ansatte på jobb / totalt. */
export function ansattePulse(mekanikere: PulseTeamMedlem[]) {
  const totalt = mekanikere.length;
  const paJobb = mekanikere.filter((m) => m.status === 'på_jobb' || m.status === 'opptatt').length;
  return { paJobb, totalt };
}
