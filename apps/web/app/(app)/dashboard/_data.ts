/**
 * Seed/mock-data for admin-oversikten. Deterministisk (ingen Math.random) så
 * server- og klient-render matcher. Byttes mot ekte tRPC-spørringer (F3-05/F5)
 * senere — visualiseringene under er allerede ekte dither-kit.
 */

export type DayRow = {
  dag: string;
  fullfort: number;
  planlagt: number;
  avlyst: number;
};

// 30 dager booking-flyt — bærer hoved-arealgrafen.
export const BOOKINGS_30D: DayRow[] = Array.from({ length: 30 }, (_, i) => {
  const wave = Math.sin(i / 3.2) * 4 + Math.cos(i / 1.7) * 2;
  const weekend = i % 7 === 5 || i % 7 === 6;
  const base = weekend ? 6 : 14;
  const fullfort = Math.max(2, Math.round(base + wave));
  const planlagt = Math.max(1, Math.round((weekend ? 4 : 8) + Math.sin(i / 2) * 3));
  const avlyst = Math.max(0, Math.round(2 + Math.cos(i / 2.4) * 1.5));
  return { dag: `${((i % 30) + 1).toString().padStart(2, '0')}.07`, fullfort, planlagt, avlyst };
});

export type Kpi = {
  key: string;
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down';
  color: 'green' | 'blue' | 'purple' | 'pink' | 'orange' | 'red' | 'grey';
  spark: number[];
};

export const KPIS: Kpi[] = [
  {
    key: 'bookinger',
    label: 'Bookinger denne uken',
    value: '128',
    delta: '+12 %',
    trend: 'up',
    color: 'green',
    spark: [64, 70, 66, 78, 74, 88, 92, 96, 104, 112, 118, 128],
  },
  {
    key: 'belegg',
    label: 'Verkstedbelegg',
    value: '87 %',
    delta: '+4 pp',
    trend: 'up',
    color: 'blue',
    spark: [72, 74, 71, 76, 80, 78, 82, 81, 84, 85, 86, 87],
  },
  {
    key: 'omsetning',
    label: 'Omsetning (30 d)',
    value: '412 000 kr',
    delta: '+6 %',
    trend: 'up',
    color: 'green',
    spark: [280, 300, 310, 305, 330, 350, 360, 372, 380, 395, 402, 412],
  },
  {
    key: 'avlyst',
    label: 'Avlyste (30 d)',
    value: '23',
    delta: '−8 %',
    trend: 'down',
    color: 'orange',
    spark: [34, 33, 31, 30, 29, 28, 27, 27, 26, 25, 24, 23],
  },
];

export type Dealer = {
  id: string;
  navn: string;
  sted: string;
  bookinger: number;
  belegg: number;
  delta: string;
  trend: 'up' | 'down';
  spark: number[];
};

export const DEALERS: Dealer[] = [
  {
    id: 'd1',
    navn: 'MC Senteret Oslo',
    sted: 'Oslo',
    bookinger: 42,
    belegg: 91,
    delta: '+9 %',
    trend: 'up',
    spark: [22, 26, 25, 30, 33, 31, 38, 41, 42],
  },
  {
    id: 'd2',
    navn: 'Bergen Marine & MC',
    sted: 'Bergen',
    bookinger: 31,
    belegg: 84,
    delta: '+4 %',
    trend: 'up',
    spark: [24, 23, 26, 28, 27, 29, 30, 30, 31],
  },
  {
    id: 'd3',
    navn: 'Trøndelag ATV',
    sted: 'Trondheim',
    bookinger: 27,
    belegg: 78,
    delta: '−3 %',
    trend: 'down',
    spark: [33, 32, 31, 30, 29, 28, 28, 27, 27],
  },
  {
    id: 'd4',
    navn: 'Sørlandet Båt & Motor',
    sted: 'Kristiansand',
    bookinger: 19,
    belegg: 69,
    delta: '+2 %',
    trend: 'up',
    spark: [14, 15, 16, 15, 17, 18, 18, 19, 19],
  },
  {
    id: 'd5',
    navn: 'Tromsø Motorsykkel',
    sted: 'Tromsø',
    bookinger: 16,
    belegg: 63,
    delta: '+7 %',
    trend: 'up',
    spark: [9, 10, 11, 12, 12, 14, 15, 15, 16],
  },
];
