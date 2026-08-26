import type { Kpi } from '../dashboard/_data';

/**
 * Endwise-intern oversikt (endwise_admin): «hva vi tjener» + plattformtall på
 * tvers av forhandlere. Ikke en enkelt forhandlers side.
 * Web Analytics (krever Vercel-deploy) + Stripe-inntekt (krever nøkler).
 * Tallene er placeholder — ikke live penger. Siden er server-gatet
 * (`admin/layout.tsx` → `krevEndwiseAdminSide`); de skal ikke prerendres
 * for anonyme. Ekte struktur: booking-aggregat har backend.
 */

// Inntekt (Stripe) — mock til Stripe er koblet
export const REVENUE_KPIS: Kpi[] = [
  {
    key: 'mrr',
    label: 'MRR',
    value: '148 500 kr',
    delta: '+8 %',
    trend: 'up',
    color: 'green',
    spark: [92, 98, 104, 110, 118, 124, 131, 138, 142, 145, 147, 149],
  },
  {
    key: 'arr',
    label: 'ARR',
    value: '1,78 mill kr',
    delta: '+8 %',
    trend: 'up',
    color: 'green',
    spark: [110, 118, 125, 132, 140, 149, 156, 163, 168, 172, 175, 178],
  },
  {
    key: 'oms',
    label: 'Omsetning (30 d)',
    value: '162 300 kr',
    delta: '+11 %',
    trend: 'up',
    color: 'green',
    spark: [120, 128, 132, 140, 138, 146, 150, 152, 158, 160, 161, 162],
  },
  {
    key: 'abo',
    label: 'Aktive abonnement',
    value: '37',
    delta: '+3',
    trend: 'up',
    color: 'blue',
    spark: [26, 27, 28, 30, 31, 32, 33, 34, 35, 36, 36, 37],
  },
];

// MRR-trend for arealgrafen (12 mnd) — mock.
export type MonthRow = { mnd: string; mrr: number };
export const MRR_SERIES: MonthRow[] = [
  { mnd: 'aug', mrr: 92000 },
  { mnd: 'sep', mrr: 98000 },
  { mnd: 'okt', mrr: 104000 },
  { mnd: 'nov', mrr: 110000 },
  { mnd: 'des', mrr: 118000 },
  { mnd: 'jan', mrr: 124000 },
  { mnd: 'feb', mrr: 131000 },
  { mnd: 'mar', mrr: 138000 },
  { mnd: 'apr', mrr: 142000 },
  { mnd: 'mai', mrr: 145000 },
  { mnd: 'jun', mrr: 147000 },
  { mnd: 'jul', mrr: 148500 },
];

// Web Analytics — , samles kun på Vercel-deploy
export const ANALYTICS_KPIS: Kpi[] = [
  {
    key: 'bes',
    label: 'Besøkende (30 d)',
    value: '12 480',
    delta: '+14 %',
    trend: 'up',
    color: 'blue',
    spark: [7, 8, 8, 9, 10, 11, 10, 12, 12, 13, 12, 12],
  },
  {
    key: 'vis',
    label: 'Sidevisninger',
    value: '38 910',
    delta: '+9 %',
    trend: 'up',
    color: 'purple',
    spark: [24, 26, 27, 29, 30, 32, 33, 35, 36, 38, 38, 39],
  },
  {
    key: 'unike',
    label: 'Unike besøk',
    value: '9 210',
    delta: '+12 %',
    trend: 'up',
    color: 'blue',
    spark: [6, 6, 7, 7, 8, 8, 8, 9, 9, 9, 9, 9],
  },
  {
    key: 'avvis',
    label: 'Avvisningsrate',
    value: '41 %',
    delta: '−3 pp',
    trend: 'down',
    color: 'orange',
    spark: [48, 47, 46, 45, 45, 44, 43, 43, 42, 42, 41, 41],
  },
];

export const TOP_PAGES: { path: string; views: number }[] = [
  { path: '/', views: 9820 },
  { path: '/mc-service', views: 5410 },
  { path: '/bestill', views: 4890 },
  { path: '/priser', views: 3120 },
  { path: '/kontakt', views: 1770 },
];

export const REFERRERS: { source: string; visits: number }[] = [
  { source: 'google.com', visits: 6210 },
  { source: 'direkte', visits: 3980 },
  { source: 'facebook.com', visits: 1240 },
  { source: 'finn.no', visits: 720 },
];

// Booking (aggregert på tvers av forhandlere) — ekte backend, seed nå
export const BOOKING_KPIS: Kpi[] = [
  {
    key: 'tot',
    label: 'Bookinger (30 d)',
    value: '1 042',
    delta: '+7 %',
    trend: 'up',
    color: 'green',
    spark: [720, 760, 780, 810, 840, 870, 900, 940, 970, 1000, 1020, 1042],
  },
  {
    key: 'belegg',
    label: 'Snittbelegg',
    value: '82 %',
    delta: '+2 pp',
    trend: 'up',
    color: 'green',
    spark: [74, 75, 76, 77, 78, 79, 80, 80, 81, 81, 82, 82],
  },
  {
    key: 'forh',
    label: 'Aktive forhandlere',
    value: '37',
    delta: '+3',
    trend: 'up',
    color: 'blue',
    spark: [28, 29, 30, 31, 32, 33, 34, 35, 35, 36, 36, 37],
  },
  {
    key: 'avlyst',
    label: 'Avlyste (30 d)',
    value: '58',
    delta: '−5 %',
    trend: 'down',
    color: 'orange',
    spark: [78, 74, 72, 70, 68, 66, 64, 62, 61, 60, 59, 58],
  },
];
