import type { ReactNode } from 'react';
import { krevEndwiseAdminSide } from '@/lib/endwise-admin-gate';
import { IkkeTilgang } from '../_shell/ikke-tilgang';

/**
 * F1-26 — server-gate for `/admin`.
 *
 * Siden var statisk prerendret (`x-nextjs-prerender: 1`) med mock Stripe-KPI
 * i HTML-en til hvem som helst som traff URL-en. Klient-guarden i
 * `(app)/layout.tsx` kjører for sent. `force-dynamic` + `requireSession` via
 * `krevEndwiseAdminSide` gjør at barn (KPI-tallene) ikke rendres for
 * uautentiserte eller andre enn `endwise_admin`.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'cdg1';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const utfall = await krevEndwiseAdminSide();
  if (utfall === 'forbidden') return <IkkeTilgang />;
  return children;
}
