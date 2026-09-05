'use client';

import { oppgraderKnappetekst, visOppgraderCta } from '@endwise/modules/billing/plans';
import { Galaxy } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';

/**
 * Oval Galaxy-knapp (React Bits, klippet inne i CTA). Svart `#111`.
 * Tekst følger TIERS-stigen via `billing.subscription.planKey`
 * (billing-rad, ellers tenants.plan). Enterprise = merke, ikke Oppgrader-CTA.
 */
export function OppgraderPille() {
  const sub = trpc.billing.subscription.useQuery(undefined, { retry: false });
  const planKey = sub.data?.planKey ?? null;
  const tekst = oppgraderKnappetekst(planKey);
  const cta = visOppgraderCta(planKey);

  if (!cta) {
    return (
      <div
        data-oppgrader-pille
        data-plan-badge
        className="mx-2 mb-1 flex h-9 items-center justify-center rounded-full border border-[#e0e0e0] bg-[#fff] px-4 text-label text-[#1d1d1f]"
      >
        {tekst}
      </div>
    );
  }

  return (
    <Link
      href={'/organisasjon?seksjon=abonnement' as Route}
      data-oppgrader-pille
      className="relative mx-2 mb-1 flex h-9 items-center justify-center overflow-hidden rounded-full bg-[#111] px-4 text-label text-white"
    >
      <span className="absolute inset-0 overflow-hidden" aria-hidden>
        <Galaxy
          starSpeed={0.2}
          density={1}
          hueShift={140}
          speed={1}
          glowIntensity={0.15}
          saturation={0}
          mouseRepulsion
          repulsionStrength={2}
          twinkleIntensity={0.3}
          rotationSpeed={0.1}
          transparent
        />
      </span>
      <span className="pointer-events-none relative z-10 truncate">{tekst}</span>
    </Link>
  );
}
