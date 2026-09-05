'use client';

import { oppgraderKnappetekst, visOppgraderCta } from '@endwise/modules/billing/plans';
import { Galaxy } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';

function GalaxyKlipp() {
  return (
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
  );
}

/**
 * Oval Galaxy-knapp (React Bits, klippet inne). Svart `#111`.
 * Tekst følger TIERS-stigen via `billing.subscription.planKey`
 * (billing-rad, ellers tenants.plan). Galaxy på både Oppgrader-CTA
 * og Enterprise-merke. Merke er uten lenke.
 */
export function OppgraderPille() {
  const sub = trpc.billing.subscription.useQuery(undefined, { retry: false });
  const planKey = sub.data?.planKey ?? null;
  const tekst = oppgraderKnappetekst(planKey);
  const cta = visOppgraderCta(planKey);
  const skall =
    'relative mx-2 mb-1 flex h-9 items-center justify-center overflow-hidden rounded-full bg-[#111] px-4 text-label text-white';

  if (!cta) {
    return (
      <div data-oppgrader-pille data-plan-badge className={skall}>
        <GalaxyKlipp />
        <span className="pointer-events-none relative z-10 truncate">{tekst}</span>
      </div>
    );
  }

  return (
    <Link href={'/organisasjon?seksjon=abonnement' as Route} data-oppgrader-pille className={skall}>
      <GalaxyKlipp />
      <span className="pointer-events-none relative z-10 truncate">{tekst}</span>
    </Link>
  );
}
