import {
  osloDatoLang,
  osloKalenderdag,
  osloPlusDager,
  osloStartAvDag,
  osloUkedagNavn,
  osloVeggtid,
} from '../_lib/oslo-dag';
import { aktivJobb, sammeKalenderdag } from '../dashboard/_pa-jobb';
import type { PhoneBooking, PhoneTraad } from './phone-home-data';

/** Mekaniker-avvik i booking-notat — `mechanic.reportDeviation`. */
export const AVVIK_NOTAT_PREFIKS = '[AVVIK ';

export function harAvvikNotat(notes: string | null | undefined): boolean {
  return Boolean(notes?.includes(AVVIK_NOTAT_PREFIKS));
}

/**
 * Ventende endringer på hjem-kortet. Kilde: booking-notat med `[AVVIK `.
 * Ekstra-tid-forespørsel fra Min dag er simulert (ikke persistert) — teller 0.
 * Godkjenning skrives ikke ennå (F7-05 selger-konsument).
 */
export function endringerTeller(jobber: PhoneBooking[]): number {
  return jobber.filter((j) => j.status !== 'cancelled' && harAvvikNotat(j.notes)).length;
}

export function pulsdagOverskrift(naa: Date) {
  return {
    ukedag: osloUkedagNavn(naa),
    dato: osloDatoLang(naa),
  };
}

const PLANLAGT_STATUS = new Set(['draft', 'confirmed']);
const LEVENDE = new Set(['draft', 'confirmed', 'in_progress']);

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

/** Uke-vindu på toppkortet — Mikael: tallene for den uken. */
export const PULSE_DAGER = 7;
export const PULSE_UKE_TITTEL = 'Denne uken';

/**
 * Verksteddagen på hjem-sirkelen: 08–19 Oslo.
 * Timeplan-rutenettet er fortsatt 08–20 (`VERKSTED_DAG_*`).
 * Ingen per-forhandler åpningstid i skjemaet.
 */
export const PULSE_DAG_START = 8;
export const PULSE_DAG_SLUTT = 19;
/** Venstre (9-retning). Buen går klokkevis mot høyre, med klokka. */
export const PULSE_DAG_BUE_START = Math.PI;

export function fmtPulseKlokke(hour: number, minute = 0): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** Andel av verksteddagen som er passert (0 før start, 1 etter slutt). */
export function dagFremgang(naa: Date, startHour = PULSE_DAG_START, sluttHour = PULSE_DAG_SLUTT) {
  const vegg = osloVeggtid(naa);
  const naaMin = vegg.hour * 60 + vegg.minute;
  const startMin = startHour * 60;
  const sluttMin = sluttHour * 60;
  const span = Math.max(1, sluttMin - startMin);
  const andel = Math.min(1, Math.max(0, (naaMin - startMin) / span));
  return {
    startLabel: fmtPulseKlokke(startHour),
    sluttLabel: fmtPulseKlokke(sluttHour),
    naaLabel: fmtPulseKlokke(vegg.hour, vegg.minute),
    andel,
  };
}

/** Plausibel dag når det ikke finnes jobber i vinduet — uten mock-merke. */
export const PULSE_PLAUSIBEL_IDAG = { planlagt: 3, paagaar: 2, ferdig: 1 };
/** Plausibel innboks uten historikk — uten mock-merke. */
export const PULSE_PLAUSIBEL_INNBOKS_MELDINGER = 7;

/** Bakoverkompatible alias — samme tall, ikke lenger merket mock. */
export const PULSE_MOCK_IDAG = PULSE_PLAUSIBEL_IDAG;
export const PULSE_MOCK_INNBOKS_MELDINGER = PULSE_PLAUSIBEL_INNBOKS_MELDINGER;
export const PULSE_MOCK_MANED = { denne: 18, forrige: 14 };

function overlapperNaa(j: PhoneBooking, naa: Date): boolean {
  if (!j.endsAt) return false;
  const start = new Date(j.startsAt).getTime();
  const slutt = new Date(j.endsAt).getTime();
  return start <= naa.getTime() && slutt > naa.getTime();
}

/** Pågår = in_progress, eller levende jobb som overlapper nå. */
export function erPaagaarJobb(j: PhoneBooking, naa: Date): boolean {
  if (j.status === 'cancelled' || j.status === 'completed') return false;
  if (j.status === 'in_progress') return true;
  return LEVENDE.has(j.status) && overlapperNaa(j, naa);
}

export function idagTall(jobber: PhoneBooking[], naa: Date) {
  const dagens = jobber.filter(
    (j) =>
      j.status !== 'cancelled' &&
      (sammeKalenderdag(j.startsAt, naa) || (j.status === 'in_progress' && overlapperNaa(j, naa))),
  );
  const paagaarJobber = dagens.filter((j) => erPaagaarJobb(j, naa));
  const paagaarIds = new Set(paagaarJobber.map((j) => j.id));
  return {
    planlagt: dagens.filter((j) => PLANLAGT_STATUS.has(j.status) && !paagaarIds.has(j.id)).length,
    paagaar: paagaarJobber.length,
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

/**
 * Uke-serie med høyere, mer spredt fyll — dither skal dekke flaten,
 * ikke sitte som en tynn merke-stripe nederst.
 */
export function plausibelSpark(naa: Date): number[] {
  const base = osloKalenderdag(naa);
  return Array.from({ length: PULSE_DAGER }, (_, i) => {
    const bunn = plausibelTall(`${base}:spark:${i}`, 4, 11);
    const topp = plausibelTall(`${base}:fill:${i}`, 0, 9);
    return bunn + topp;
  });
}

/** Vindu: i dag minus 6 døgn → i morgen (7 kalenderdager, Oslo). */
export function dagerVindu(naa: Date) {
  const iDag = osloKalenderdag(naa);
  return {
    fra: osloStartAvDag(osloPlusDager(iDag, -(PULSE_DAGER - 1))),
    til: osloStartAvDag(osloPlusDager(iDag, 1)),
  };
}

/**
 * Endringer-liste og hjem-badge: 30 døgn bak / 14 fram.
 * Samme vindu som `/timeplan/endringer`.
 */
export function endringerVindu(naa: Date) {
  const iDag = osloKalenderdag(naa);
  return {
    fra: osloStartAvDag(osloPlusDager(iDag, -30)),
    til: osloStartAvDag(osloPlusDager(iDag, 14)),
  };
}

/** @deprecated Bruk dagerVindu — 7 dager, ikke måned mot forrige. */
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

export function siste7dSpark(jobber: PhoneBooking[], naa: Date): number[] {
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

/** @deprecated Bruk siste7dSpark. */
export function siste30dSpark(jobber: PhoneBooking[], naa: Date): number[] {
  return siste7dSpark(jobber, naa);
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

/**
 * På jobb = aktiv jobb-tildeling, ikke timeføring / stempelklokke.
 *
 * Regel (F3-05, Mikael CODE-GO):
 * En ansatt er «på jobb» når hen har en *aktiv tildeling* nå —
 * `aktivJobb` i `_pa-jobb.ts`: `in_progress`, eller levende booking
 * (draft/confirmed/in_progress) som overlapper nå, ellers neste levende i dag.
 * `mechanics.active`, ferie og planlegging uten tildeling teller ikke.
 * Status-humor (`på_jobb` / `ledig`) kommer fra time-/belastningsfelt og
 * brukes ikke her — verkstedet har ikke timeføring.
 */
export function ansattePulse(
  mekanikere: PulseTeamMedlem[],
  jobber: PhoneBooking[] = [],
  naa: Date = new Date(),
) {
  const totalt = mekanikere.length;
  const tildelt = jobber.map((j) => ({
    ...j,
    mechanicId: j.mechanicId ?? null,
    endsAt: j.endsAt ?? j.startsAt,
  }));
  const paJobb = mekanikere.filter((m) => aktivJobb(tildelt, m.id, naa) != null).length;
  return { paJobb, totalt };
}

export type AnalyserMockStat = {
  id: string;
  label: string;
  verdi: number;
  delta: string;
  opp: boolean;
  serie: number[];
};

/** Mock nettsidevisninger til ekte analyse finnes. Stabil per uke. */
export function analyserMockStats(naa: Date): AnalyserMockStat[] {
  const uke = osloKalenderdag(naa);
  const vis = plausibelTall(`${uke}:vis`, 180, 420);
  const start = plausibelTall(`${uke}:start`, 8, 28);
  const retur = plausibelTall(`${uke}:retur`, 12, 40);
  const tid = plausibelTall(`${uke}:tid`, 40, 95);
  return [
    {
      id: 'visninger',
      label: 'Visninger',
      verdi: vis,
      delta: '+11 %',
      opp: true,
      serie: Array.from({ length: 7 }, (_, i) => plausibelTall(`${uke}:v:${i}`, 18, 72)),
    },
    {
      id: 'start',
      label: 'Bookingstart',
      verdi: start,
      delta: '+4 %',
      opp: true,
      serie: Array.from({ length: 7 }, (_, i) => plausibelTall(`${uke}:s:${i}`, 2, 12)),
    },
    {
      id: 'retur',
      label: 'Retur',
      verdi: retur,
      delta: '−3 %',
      opp: false,
      serie: Array.from({ length: 7 }, (_, i) => plausibelTall(`${uke}:r:${i}`, 4, 16)),
    },
    {
      id: 'tid',
      label: 'Tid på siden',
      verdi: tid,
      delta: '+8 %',
      opp: true,
      serie: Array.from({ length: 7 }, (_, i) => plausibelTall(`${uke}:t:${i}`, 20, 90)),
    },
  ];
}
