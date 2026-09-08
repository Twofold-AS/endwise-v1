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

export type InnboksTone = 'ok' | 'fare' | 'noytral';
export type InnboksBarPunkt = { dag: string; n: number };

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

/** Plausibel dag når det ikke finnes jobber i vinduet. */
export const PULSE_MOCK_IDAG = { planlagt: 3, paagaar: 2, ferdig: 1 };
/** Plausibel månedsboble uten historikk. */
export const PULSE_MOCK_MANED = { denne: 18, forrige: 14 };
/** Plausibel innboks-rad uten historikk. */
export const PULSE_MOCK_INNBOKS_MELDINGER = 7;
export const PULSE_MOCK_INNBOKS_NYE = 3;
export const PULSE_MOCK_INNBOKS_BAR: InnboksBarPunkt[] = [
  { dag: 'm-6', n: 1 },
  { dag: 'm-5', n: 2 },
  { dag: 'm-4', n: 1 },
  { dag: 'm-3', n: 2 },
  { dag: 'm-2', n: 3 },
  { dag: 'm-1', n: 2 },
  { dag: 'm-0', n: 3 },
];

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

/** Vindu: start forrige måned → i morgen (Oslo). */
export function manedVindu(naa: Date) {
  return {
    fra: forrigeManedStart(naa),
    til: osloStartAvDag(osloPlusDager(osloKalenderdag(naa), 1)),
  };
}

export function manedBookingTall(jobber: PhoneBooking[], naa: Date) {
  const denneKey = osloManedKey(naa);
  const forrigeKey = osloManedKey(forrigeManedStart(naa));
  const aktiv = (j: PhoneBooking) => j.status !== 'cancelled';
  const denne = jobber.filter((j) => aktiv(j) && osloManedKey(j.startsAt) === denneKey).length;
  const forrige = jobber.filter((j) => aktiv(j) && osloManedKey(j.startsAt) === forrigeKey).length;
  if (denne + forrige === 0) return { ...PULSE_MOCK_MANED, mock: true };
  return { denne, forrige, mock: false };
}

/** Ingen jobber i vinduet = ingen historikk → mock I dag-tall + badge. */
export function idagVisning(jobber: PhoneBooking[], naa: Date) {
  const tall = idagTall(jobber, naa);
  if (jobber.length === 0) return { ...PULSE_MOCK_IDAG, mock: true };
  return { ...tall, mock: false };
}

function nyePerDag(traader: PhoneTraad[], naa: Date, dager = 7): InnboksBarPunkt[] {
  const iDag = osloKalenderdag(naa);
  const values: InnboksBarPunkt[] = [];
  for (let i = dager - 1; i >= 0; i--) {
    const dag = osloPlusDager(iDag, -i);
    values.push({
      dag,
      n: traader.filter((t) => t.lastMessageAt && osloKalenderdag(t.lastMessageAt) === dag).length,
    });
  }
  return values;
}

/**
 * Innboks-rad: siste meldinger + ny-forespørsel vs vanlig per dag.
 * Grønn når det er klart flere enn vanlig, rød når det er færre.
 */
export function innboksRad(traader: PhoneTraad[], naa: Date) {
  const meldinger = traader.reduce((sum, t) => sum + (t.unread ?? 0), 0);
  const bar = nyePerDag(traader, naa);
  const nye = bar.at(-1)?.n ?? 0;
  const historikk = bar.slice(0, -1);
  const harHistorikk = meldinger > 0 || bar.some((v) => v.n > 0);
  if (!harHistorikk) {
    return {
      meldinger: PULSE_MOCK_INNBOKS_MELDINGER,
      nye: PULSE_MOCK_INNBOKS_NYE,
      bar: PULSE_MOCK_INNBOKS_BAR,
      tone: 'ok' as InnboksTone,
      mock: true,
    };
  }
  const usual = historikk.reduce((sum, v) => sum + v.n, 0) / Math.max(historikk.length, 1);
  let tone: InnboksTone = 'noytral';
  if (usual === 0) tone = nye > 0 ? 'ok' : 'noytral';
  else if (nye > usual * 1.25) tone = 'ok';
  else if (nye < usual * 0.75) tone = 'fare';
  return { meldinger, nye, bar, tone, mock: false };
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
