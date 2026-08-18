/**
 * F5-18 — Mock-data for Analyse.
 *
 * ⚠️ **ALT I DENNE FILA ER OPPDIKTET.** Ingen av tallene kommer fra en database.
 * Hver graf er merket «Mock» i UI-et — merkelappen leser `KILDE`-tabellen under,
 * samme kilde som forklaringsteksten. Da kan ikke en graf bli stående umerket
 * fordi noen glemte det.
 *
 * Deterministisk (ingen `Math.random`, ingen `Date.now`) slik at server- og
 * klient-render gir identisk resultat. Tallene ligner et lite verksted:
 * ~10–18 saker per virkedag, lavere i helg, belegg rundt 80 %.
 *
 * ⛔ Ingen kunde-PII her, og det skal aldri komme inn. Analyse viser aggregater.
 */

export type Kilde = 'mock' | 'ekte';

/** Periodene brukeren kan bytte mellom øverst på siden. */
export type Periode = '1d' | '7d' | '30d';

export const PERIODER: { key: Periode; label: string }[] = [
  { key: '1d', label: '1 dag' },
  { key: '7d', label: '7 dager' },
  { key: '30d', label: '30 dager' },
];

/** Hvor hver graf henter data fra i dag, og hva som skal til for å koble ekte. */
export const KILDE: Record<string, { kilde: Kilde; forklaring: string }> = {
  bookingvolum: {
    kilde: 'mock',
    forklaring:
      'Kobles til bookings.list aggregert per dag (RLS-scopet). Ruten finnes — aggregatet mangler.',
  },
  belegg: {
    kilde: 'mock',
    forklaring:
      'Krever kapasitet per mekaniker (F3-11) satt opp mot faktisk booket tid. Begge deler finnes i schema.',
  },
  sidevisninger: {
    kilde: 'mock',
    forklaring:
      'Vercel Web Analytics samler KUN inn på deploy (F13-02), ikke på localhost. Cookieless og anonymisert (F14-18).',
  },
  kilder: {
    kilde: 'mock',
    forklaring: 'Samme som sidevisninger — krever deploy før tallene finnes.',
  },
  besokende: {
    kilde: 'mock',
    forklaring:
      'Simulert. Ekte strøm kommer fra kundewidgeten via SSE (apps/stream) — se _visitors.ts.',
  },
};

/* ── Bookingvolum ──────────────────────────────────────────────────────────
 * Søylegraf. Helg gir lavere volum; derfor «hakker» kurven i sjuertakt.
 */
export type DagRad = { dag: string; fullfort: number; avlyst: number };

const VOLUM_BASIS = [14, 16, 15, 17, 13, 6, 4];
const VOLUM_VARIASJON = [0, 2, -1, 1, 3, -2, 1, 0, 2, -1];

const VOLUM_FULL: DagRad[] = Array.from({ length: 30 }, (_, i) => {
  const ukedag = i % 7;
  const helg = ukedag >= 5;
  const fullfort = Math.max(2, VOLUM_BASIS[ukedag] + VOLUM_VARIASJON[i % 10]);
  const avlyst = helg ? (i % 3 === 0 ? 1 : 0) : i % 4;
  return { dag: `${((i % 30) + 1).toString().padStart(2, '0')}.07`, fullfort, avlyst };
});

/* ── Trafikk ───────────────────────────────────────────────────────────────
 * Arealgraf. To serier: alle sidevisninger og de som endte i en booking.
 */
export type TrafikkRad = { dag: string; visninger: number; bookingstart: number };

const TRAFIKK_BASIS = [210, 244, 232, 258, 226, 118, 96];
const TRAFIKK_VARIASJON = [0, 18, -12, 26, 8, -20, 14, 4, 22, -6];

const TRAFIKK_FULL: TrafikkRad[] = Array.from({ length: 30 }, (_, i) => {
  const visninger = Math.max(40, TRAFIKK_BASIS[i % 7] + TRAFIKK_VARIASJON[i % 10]);
  return {
    dag: `${((i % 30) + 1).toString().padStart(2, '0')}.07`,
    visninger,
    // Rundt 8 % av besøkende starter en booking. Utledet, ikke uavhengig tall.
    bookingstart: Math.round(visninger * 0.08),
  };
});

/** «1 dag» viser timer, ikke dager — en dag med én søyle er ingen graf. */
const TIMER = ['08', '09', '10', '11', '12', '13', '14', '15', '16'];
const VOLUM_TIMER: DagRad[] = TIMER.map((t, i) => ({
  dag: `${t}:00`,
  fullfort: [1, 3, 2, 3, 1, 2, 3, 2, 1][i],
  avlyst: i === 4 ? 1 : 0,
}));
const TRAFIKK_TIMER: TrafikkRad[] = TIMER.map((t, i) => {
  const visninger = [18, 34, 41, 38, 22, 30, 44, 36, 19][i];
  return { dag: `${t}:00`, visninger, bookingstart: Math.round(visninger * 0.08) };
});

/** Datasettet som hører til valgt periode. */
export function volumFor(p: Periode): DagRad[] {
  if (p === '1d') return VOLUM_TIMER;
  return VOLUM_FULL.slice(p === '7d' ? -7 : -30);
}
export function trafikkFor(p: Periode): TrafikkRad[] {
  if (p === '1d') return TRAFIKK_TIMER;
  return TRAFIKK_FULL.slice(p === '7d' ? -7 : -30);
}

/* ── Belegg og avlysningsrate ──────────────────────────────────────────────
 * Linjegraf, to serier i prosent. Belegget stiger jevnt; avlysningsraten
 * ligger lavt og flatt — slik et sunt verksted ser ut.
 */
export type UkeRad = { uke: string; belegg: number; avlysning: number };

const BELEGG = [71, 74, 72, 78, 80, 77, 82, 84, 83, 86, 88, 87];
const AVLYSNING = [9, 8, 11, 7, 6, 8, 5, 6, 4, 5, 4, 3];

const BELEGG_FULL: UkeRad[] = BELEGG.map((belegg, i) => ({
  uke: `U${(18 + i).toString()}`,
  belegg,
  avlysning: AVLYSNING[i],
}));

export function beleggFor(p: Periode): UkeRad[] {
  if (p === '1d') return BELEGG_FULL.slice(-2);
  return BELEGG_FULL.slice(p === '7d' ? -4 : -12);
}

/* ── Trafikkilder — PAIGRAF ────────────────────────────────────────────────
 * Sortert synkende. Fem skiver er grensen for hva en pai kan lese ut;
 * flere ville blitt fargeflis.
 */
export type KildeRad = { kilde: string; besok: number };

export const KILDER: KildeRad[] = [
  { kilde: 'Google', besok: 1840 },
  { kilde: 'Direkte', besok: 960 },
  { kilde: 'Facebook', besok: 412 },
  { kilde: 'Finn.no', besok: 268 },
  { kilde: 'Instagram', besok: 154 },
];

export const KILDER_TOTALT = KILDER.reduce((s, k) => s + k.besok, 0);

/* ── Nøkkeltall per periode ────────────────────────────────────────────────
 * Tallet står alltid i klartekst — regelen som overlevde dither-fjerningen.
 */
export type Nokkeltall = {
  key: string;
  label: string;
  verdi: string;
  delta: string;
  opp: boolean;
  forklaring: string;
};

const NOKKELTALL_PER_PERIODE: Record<Periode, Nokkeltall[]> = {
  '1d': [
    {
      key: 'saker',
      label: 'Fullførte saker',
      verdi: '18',
      delta: '+2',
      opp: true,
      forklaring: 'Saker markert som ferdig i dag.',
    },
    {
      key: 'belegg',
      label: 'Belegg',
      verdi: '84 %',
      delta: '+3 pp',
      opp: true,
      forklaring: 'Booket tid mot tilgjengelig tid.',
    },
    {
      key: 'besok',
      label: 'Besøk på nettsiden',
      verdi: '282',
      delta: '−4 %',
      opp: false,
      forklaring: 'Unike økter, uten informasjonskapsler.',
    },
    {
      key: 'avlyst',
      label: 'Avlysningsrate',
      verdi: '4 %',
      delta: '+1 pp',
      opp: false,
      forklaring: 'Andel avlyste av totalt bookede.',
    },
  ],
  '7d': [
    {
      key: 'saker',
      label: 'Fullførte saker',
      verdi: '86',
      delta: '+8 %',
      opp: true,
      forklaring: 'Saker markert som ferdig siste uke.',
    },
    {
      key: 'belegg',
      label: 'Belegg',
      verdi: '82 %',
      delta: '+4 pp',
      opp: true,
      forklaring: 'Booket tid mot tilgjengelig tid.',
    },
    {
      key: 'besok',
      label: 'Besøk på nettsiden',
      verdi: '1 402',
      delta: '+11 %',
      opp: true,
      forklaring: 'Unike økter, uten informasjonskapsler.',
    },
    {
      key: 'avlyst',
      label: 'Avlysningsrate',
      verdi: '3 %',
      delta: '−1 pp',
      opp: true,
      forklaring: 'Andel avlyste av totalt bookede.',
    },
  ],
  '30d': [
    {
      key: 'saker',
      label: 'Fullførte saker',
      verdi: '341',
      delta: '+12 %',
      opp: true,
      forklaring: 'Saker markert som ferdig siste 30 dager.',
    },
    {
      key: 'belegg',
      label: 'Belegg',
      verdi: '80 %',
      delta: '+6 pp',
      opp: true,
      forklaring: 'Snittbelegg over perioden.',
    },
    {
      key: 'besok',
      label: 'Besøk på nettsiden',
      verdi: '5 892',
      delta: '+9 %',
      opp: true,
      forklaring: 'Unike økter, uten informasjonskapsler.',
    },
    {
      key: 'avlyst',
      label: 'Avlysningsrate',
      verdi: '3 %',
      delta: '−2 pp',
      opp: true,
      forklaring: 'Andel avlyste av totalt bookede.',
    },
  ],
};

export function nokkeltallFor(p: Periode): Nokkeltall[] {
  return NOKKELTALL_PER_PERIODE[p];
}
