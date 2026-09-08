import { osloKalenderdag, osloPlusDager } from '../_lib/oslo-dag';
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

/** Plausibel dag når vinduet er tomt — aldri «For lite data». */
export const PULSE_MOCK_IDAG = { planlagt: 3, paagaar: 2, ferdig: 1 };
/** Denne / forrige måned når begge er null. */
export const PULSE_MOCK_MAANED = { denne: 12, forrige: 8 };
/** Ny-forespørsel når historikken er for tynn. */
export const PULSE_MOCK_FORESPORSEL = { antall: 5, tone: 'green' as const, ratio: 0.72 };

export function osloMaanedStart(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

export function osloNesteMaanedStart(ymd: string): string {
  const [y, m] = ymd.split('-').map(Number);
  const nesteM = m === 12 ? 1 : m + 1;
  const nesteY = m === 12 ? y + 1 : y;
  return `${nesteY}-${String(nesteM).padStart(2, '0')}-01`;
}

export function osloForrigeMaanedStart(ymd: string): string {
  return osloMaanedStart(osloPlusDager(osloMaanedStart(ymd), -1));
}

function iMaaned(dag: string, fra: string, til: string) {
  return dag >= fra && dag < til;
}

/** Bookinger denne måneden vs forrige (startsAt, uten cancelled). */
export function bookingMaanedVsForrige(jobber: PhoneBooking[], naa: Date) {
  const idag = osloKalenderdag(naa);
  const denneStart = osloMaanedStart(idag);
  const nesteStart = osloNesteMaanedStart(idag);
  const forrigeStart = osloForrigeMaanedStart(idag);
  const tell = (fra: string, til: string) =>
    jobber.filter((j) => {
      if (j.status === 'cancelled') return false;
      return iMaaned(osloKalenderdag(j.startsAt), fra, til);
    }).length;
  return {
    denne: tell(denneStart, nesteStart),
    forrige: tell(forrigeStart, denneStart),
    labels: [forrigeStart.slice(0, 7), denneStart.slice(0, 7)] as const,
  };
}

/** Tom månedshistorikk → mock-boble, ikke flat null. */
export function maanedSparkVisning(raw: ReturnType<typeof bookingMaanedVsForrige>) {
  if (raw.denne > 0 || raw.forrige > 0) return { ...raw, mock: false };
  return { ...raw, denne: PULSE_MOCK_MAANED.denne, forrige: PULSE_MOCK_MAANED.forrige, mock: true };
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

function erForesporsel(j: PhoneBooking) {
  return j.status === 'draft' || j.source === 'widget';
}

function foresporselDag(j: PhoneBooking) {
  return osloKalenderdag(j.createdAt ?? j.startsAt);
}

/**
 * Nye forespørsler i dag mot snitt per dag siste 14 dager.
 * Flere enn vanlig → grønn; færre → rød. Tynn historikk → mock + badge.
 */
export function foresporselTrend(
  jobber: PhoneBooking[],
  naa: Date,
  dager = 14,
): { antall: number; tone: 'green' | 'red' | 'neutral'; ratio: number; mock: boolean } {
  const idag = osloKalenderdag(naa);
  const reqs = jobber.filter(erForesporsel);
  const iDag = reqs.filter((j) => foresporselDag(j) === idag).length;
  const perDag = new Map<string, number>();
  for (let i = 1; i <= dager; i++) {
    perDag.set(osloPlusDager(idag, -i), 0);
  }
  for (const j of reqs) {
    const d = foresporselDag(j);
    if (perDag.has(d)) perDag.set(d, (perDag.get(d) ?? 0) + 1);
  }
  const verdier = [...perDag.values()];
  const dagerMedData = verdier.filter((v) => v > 0).length;
  if (dagerMedData < 3) {
    return { ...PULSE_MOCK_FORESPORSEL, mock: true };
  }
  const usual = verdier.reduce((a, b) => a + b, 0) / dager;
  const tone: 'green' | 'red' | 'neutral' =
    iDag > usual * 1.15 ? 'green' : iDag < usual * 0.85 ? 'red' : 'neutral';
  const ratio = usual <= 0 ? (iDag > 0 ? 1 : 0.2) : Math.min(1, Math.max(0.12, iDag / (usual * 2)));
  return { antall: iDag, tone, ratio, mock: false };
}

/** Uleste = «siste meldinger»-telleren pilen peker på. */
export function sisteMeldinger(traader: PhoneTraad[]) {
  const ulest = traader.reduce((sum, t) => sum + (t.unread ?? 0), 0);
  return { ulest };
}

/**
 * Deler som venter på bestilling / trenger godkjenning.
 * Lav beholdning (`underMinimum`) eller reservert uten tilgjengelig.
 */
export function lagerVenter(deler: PhoneDelPulse[]) {
  const venter = deler.filter((d) => d.underMinimum || (d.reserved > 0 && d.tilgjengelig <= 0));
  return {
    antall: venter.length,
    tekst: 'Trenger godkjenning',
  };
}

export function ansattePaJobb(mekanikere: PulseTeamMedlem[]) {
  const total = mekanikere.length;
  const paJobb = mekanikere.filter((m) => m.status === 'opptatt' || m.status === 'på_jobb').length;
  return {
    paJobb,
    total,
    tekst: 'Ansatte på jobb',
    tall: `${paJobb}/${total}`,
  };
}
