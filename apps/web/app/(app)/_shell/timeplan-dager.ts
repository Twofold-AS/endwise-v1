import {
  osloKalenderdag,
  osloPlusDager,
  osloVeggklokke,
  osloVeggtid,
  PRODUKT_TIDSSONE,
} from '../_lib/oslo-dag';

export const TIMEPLAN_DAG_START = 8;
export const TIMEPLAN_DAG_SLUTT = 20;
export const TIMEPLAN_DAG_TIMER = TIMEPLAN_DAG_SLUTT - TIMEPLAN_DAG_START;
export const TIMEPLAN_PX_PER_TIME = 44;

export const TIMEPLAN_TIMELISTE = Array.from(
  { length: TIMEPLAN_DAG_TIMER },
  (_, i) => TIMEPLAN_DAG_START + i,
);

export type TimeplanDag = {
  ymd: string;
  label: string;
  weekday: string;
};

export type TimeplanManed = {
  ymd: string;
  label: string;
  aktiv: boolean;
};

/** Valgt dag først, deretter de neste dagene i Europe/Oslo. */
export function timeplanDagerFra(valgtYmd: string, antall = 3): TimeplanDag[] {
  const start = osloKalenderdag(valgtYmd);
  const out: TimeplanDag[] = [];
  for (let i = 0; i < antall; i++) {
    const ymd = osloPlusDager(start, i);
    const middag = osloVeggklokke(ymd, 12, 0);
    out.push({
      ymd,
      label: middag.toLocaleDateString('nb-NO', {
        day: '2-digit',
        month: 'short',
        timeZone: PRODUKT_TIDSSONE,
      }),
      weekday: middag.toLocaleDateString('nb-NO', {
        weekday: 'short',
        timeZone: PRODUKT_TIDSSONE,
      }),
    });
  }
  return out;
}

/** Månedsnavn for valgt Oslo-dag, nb-NO (capitalize i UI). */
export function timeplanManedNavn(valgtYmd: string): string {
  const ymd = osloKalenderdag(valgtYmd);
  return osloVeggklokke(ymd, 12, 0).toLocaleDateString('nb-NO', {
    month: 'long',
    year: 'numeric',
    timeZone: PRODUKT_TIDSSONE,
  });
}

/** Ett kalendermåned fram/tilbake. Valgt dag klemmes inn i måneden (31. jan → 28. feb). */
export function timeplanSkiftManed(valgtYmd: string, delta: number): string {
  const ymd = osloKalenderdag(valgtYmd);
  const [y, m, d] = ymd.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  const nyY = Math.floor(total / 12);
  const nyM = (total % 12) + 1;
  const siste = new Date(Date.UTC(nyY, nyM, 0)).getUTCDate();
  const dag = Math.min(d, siste);
  return `${nyY}-${String(nyM).padStart(2, '0')}-${String(dag).padStart(2, '0')}`;
}

/** Tre måneder: forrige, denne (aktiv), neste — beholdt for tester/kallsteder utenom stripen. */
export function timeplanManeder(valgtYmd: string): TimeplanManed[] {
  const ymd = osloKalenderdag(valgtYmd);
  const [y, m] = ymd.split('-').map(Number);
  const denne = `${y}-${String(m).padStart(2, '0')}-01`;
  const forrige = `${osloPlusDager(denne, -1).slice(0, 8)}01`;
  const nesteMnd = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return [forrige, denne, nesteMnd].map((start) => {
    const middag = osloVeggklokke(start, 12, 0);
    return {
      ymd: start,
      label: middag.toLocaleDateString('nb-NO', {
        month: 'long',
        year: 'numeric',
        timeZone: PRODUKT_TIDSSONE,
      }),
      aktiv: start.slice(0, 7) === ymd.slice(0, 7),
    };
  });
}

export function timeplanKloss(
  startsAt: Date | string,
  endsAt: Date | string,
  pxPerTime = TIMEPLAN_PX_PER_TIME,
): { top: number; height: number } {
  const s = osloVeggtid(startsAt);
  const e = osloVeggtid(endsAt);
  const startTimer = s.hour + s.minute / 60;
  const sluttTimer = e.hour + e.minute / 60;
  const fra = Math.max(TIMEPLAN_DAG_START, Math.min(startTimer, TIMEPLAN_DAG_SLUTT));
  const til = Math.min(TIMEPLAN_DAG_SLUTT, Math.max(sluttTimer, fra + 0.25));
  return {
    top: (fra - TIMEPLAN_DAG_START) * pxPerTime,
    height: Math.max(22, (til - fra) * pxPerTime),
  };
}

export type KlossSpor = { spor: number; sporAntall: number };

/**
 * Side-ved-side når flere jobber overlapper (fem folk kl. 08:00).
 * Hver kloss får eget spor, slik at staff-fargen synes — ikke én oppå neste.
 */
export function pakkKlosser<T extends { startsAt: Date | string; endsAt: Date | string }>(
  rader: readonly T[],
): KlossSpor[] {
  const n = rader.length;
  if (n === 0) return [];

  const items = rader.map((r, i) => {
    const start = new Date(r.startsAt).getTime();
    const end = Math.max(start + 1, new Date(r.endsAt).getTime());
    return { i, start, end, spor: 0 };
  });
  items.sort((a, b) => a.start - b.start || a.end - b.end || a.i - b.i);

  type Node = (typeof items)[number];
  const aktive: Node[] = [];
  const klynger: Node[][] = [];
  let klynge: Node[] = [];

  for (const it of items) {
    for (let i = aktive.length - 1; i >= 0; i -= 1) {
      const ferdig = aktive[i];
      if (ferdig && ferdig.end <= it.start) aktive.splice(i, 1);
    }
    if (aktive.length === 0 && klynge.length > 0) {
      klynger.push(klynge);
      klynge = [];
    }
    const brukt = new Set(aktive.map((a) => a.spor));
    let spor = 0;
    while (brukt.has(spor)) spor += 1;
    it.spor = spor;
    aktive.push(it);
    klynge.push(it);
  }
  if (klynge.length > 0) klynger.push(klynge);

  const out: KlossSpor[] = Array.from({ length: n }, () => ({ spor: 0, sporAntall: 1 }));
  for (const k of klynger) {
    const sporAntall = Math.max(1, ...k.map((x) => x.spor + 1));
    for (const x of k) {
      out[x.i] = { spor: x.spor, sporAntall };
    }
  }
  return out;
}

export function klossSporStil(spor: number, sporAntall: number): { left: string; width: string } {
  const antall = Math.max(1, sporAntall);
  const i = Math.max(0, Math.min(spor, antall - 1));
  return {
    left: `calc(${(i / antall) * 100}% + 0.25rem)`,
    width: `calc(${100 / antall}% - 0.5rem)`,
  };
}
