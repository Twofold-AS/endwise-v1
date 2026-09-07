import { osloKalenderdag, osloPlusDager } from '../_lib/oslo-dag';
import { fmtTime } from '../bookinger/_status';
import { sammeKalenderdag } from '../dashboard/_pa-jobb';
import { jobbHva, type PhoneBooking, type PhoneTraad } from './phone-home-data';

export const APEN_JOBB = new Set(['draft', 'confirmed', 'in_progress']);
const STARTER_STATUS = new Set(['draft', 'confirmed']);
const LUKKET_JOBB = new Set(['cancelled', 'completed', 'no_show']);

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

export function idagTall(jobber: PhoneBooking[], naa: Date) {
  const dagens = jobber.filter(
    (j) => sammeKalenderdag(j.startsAt, naa) && j.status !== 'cancelled',
  );
  return {
    starter: dagens.filter((j) => STARTER_STATUS.has(j.status)).length,
    paagaar: dagens.filter((j) => j.status === 'in_progress').length,
    ferdig: dagens.filter((j) => j.status === 'completed').length,
  };
}

/** Jonas-skisse: 14 min når 7d-utvalget er for tynt. */
export const PULSE_MOCK_SVAR_MS = 14 * 60_000;
/** Plausibel 7d-spark når ingen completed-historikk finnes. */
export const PULSE_MOCK_SPARK = [1, 2, 1, 3, 2, 4, 3];
export const PULSE_MOCK_IDAG = { starter: 3, paagaar: 2, ferdig: 1 };

export function ferdigSpark7d(jobber: PhoneBooking[], naa: Date) {
  const iDag = osloKalenderdag(naa);
  const labels: string[] = [];
  const values: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const dag = osloPlusDager(iDag, -i);
    labels.push(dag.slice(5));
    values.push(
      jobber.filter((j) => osloKalenderdag(j.startsAt) === dag && j.status === 'completed').length,
    );
  }
  return { labels, values };
}

/** Tom 7d-historikk → mock-spark, ikke flat null-linje. */
export function sparkVisning(spark: { labels: string[]; values: number[] }) {
  if (spark.values.some((v) => v > 0)) return { ...spark, mock: false };
  return { labels: spark.labels, values: PULSE_MOCK_SPARK, mock: true };
}

/** Ingen jobber i vinduet = ingen historikk → mock I dag-tall + badge. */
export function idagVisning(jobber: PhoneBooking[], naa: Date) {
  const tall = idagTall(jobber, naa);
  if (jobber.length === 0) return { ...PULSE_MOCK_IDAG, mock: true };
  return { ...tall, mock: false };
}

export function formatVarighetNb(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60_000));
  if (min < 1) return '< 1 min';
  if (min < 60) return `${min} min`;
  const timer = Math.floor(min / 60);
  const rest = min % 60;
  if (timer < 24) return rest ? `${timer} t ${rest} min` : `${timer} t`;
  const dager = Math.floor(timer / 24);
  const restT = timer % 24;
  return restT ? `${dager} d ${restT} t` : `${dager} d`;
}

export function innboksPulse(traader: PhoneTraad[], naa: Date) {
  const ulest = traader.reduce((sum, t) => sum + (t.unread ?? 0), 0);
  const uleste = traader.filter((t) => (t.unread ?? 0) > 0);
  if (ulest === 0) return { ulest: 0, sla: 'Ingen uleste', eldsteAt: null as Date | null };
  const eldste = [...uleste].sort((a, b) => {
    const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : Number.POSITIVE_INFINITY;
    const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : Number.POSITIVE_INFINITY;
    return at - bt;
  })[0];
  const eldsteAt = eldste?.lastMessageAt ? new Date(eldste.lastMessageAt) : null;
  const sla = eldsteAt
    ? `Eldste uleste · ${formatVarighetNb(naa.getTime() - eldsteAt.getTime())}`
    : 'Uleste';
  return { ulest, sla, eldsteAt };
}

/**
 * Deler på åpne jobber — ikke hele lageret.
 * Uten booking_parts er `reserved` det eneste jobbsignalet i skjemaet.
 * Lav/mangler uten reserved telles ikke.
 */
export function delerPaApneJobber(deler: PhoneDelPulse[], jobber: PhoneBooking[]) {
  const apne = jobber.filter((j) => APEN_JOBB.has(j.status));
  if (apne.length === 0) return { antall: 0, meta: 'Ingen åpne jobber' };
  const relevante = deler.filter((d) => d.reserved > 0 && (d.underMinimum || d.tilgjengelig <= 0));
  if (relevante.length === 0) return { antall: 0, meta: 'Ingen mangler på åpne jobber' };
  const forste = relevante[0];
  const extra = relevante.length > 1 ? ` · ${relevante.length} deler` : '';
  return { antall: relevante.length, meta: `${forste?.name ?? 'Del'}${extra}` };
}

export function svarhastighetVisning(medianMs: number | null) {
  if (medianMs == null) {
    return {
      tall: formatVarighetNb(PULSE_MOCK_SVAR_MS),
      meta: 'Median førstesvar · 7 dager',
      mock: true,
    };
  }
  return { tall: formatVarighetNb(medianMs), meta: 'Median førstesvar · 7 dager', mock: false };
}

export type TimeplanGulvRad = { id: string; time: string; what: string; who: string };

export function nesteTreJobber(jobber: PhoneBooking[], naa: Date, limit = 3): TimeplanGulvRad[] {
  return jobber
    .filter((j) => !LUKKET_JOBB.has(j.status))
    .filter((j) => {
      const start = new Date(j.startsAt).getTime();
      return start >= naa.getTime() || sammeKalenderdag(j.startsAt, naa);
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, limit)
    .map((j) => ({
      id: j.id,
      time: fmtTime(j.startsAt),
      what: jobbHva(j),
      who: j.mechanicName?.trim() || '—',
    }));
}

export function teamPulse(mekanikere: PulseTeamMedlem[]) {
  const ledig = mekanikere.filter((m) => m.status === 'ledig').length;
  const opptatt = mekanikere.filter((m) => m.status === 'opptatt' || m.status === 'på_jobb').length;
  if (mekanikere.length === 0) return { ledig: 0, opptatt: 0, meta: 'Ingen mekanikere' };
  if (ledig + opptatt === 0) return { ledig: 0, opptatt: 0, meta: 'Ingen på jobb' };
  return { ledig, opptatt, meta: `${ledig} ledig · ${opptatt} opptatt` };
}
