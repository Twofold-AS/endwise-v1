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
 * Enterprise-merke: Galaxy på carbon (ikke lime — merke er ikke CTA).
 * Oppgrader-CTA: én acid-lime flate, void-tekst, uten Galaxy-dekor.
 * Tekst følger TIERS-stigen via `billing.subscription.planKey`.
 */
export function OppgraderPille() {
  const sub = trpc.billing.subscription.useQuery(undefined, { retry: false });
  const planKey = sub.data?.planKey ?? null;
  const tekst = oppgraderKnappetekst(planKey);
  const cta = visOppgraderCta(planKey);
  const skall =
    'relative mx-2 mb-1 flex h-9 items-center justify-center overflow-hidden rounded-full px-4 text-label md:mx-0 md:h-[52px] md:w-[233px] md:px-8';
  const fyll = cta
    ? 'bg-primary text-primary-foreground'
    : 'border border-border bg-surface text-fg';

  if (!cta) {
    return (
      <div
        data-oppgrader-pille
        data-plan-badge
        data-shell-enterprise
        className={`${skall} ${fyll}`}
      >
        <GalaxyKlipp />
        <span className="pointer-events-none relative z-10 truncate md:text-[18px] md:leading-[22px]">
          {tekst}
        </span>
      </div>
    );
  }

  return (
    <Link
      href={'/organisasjon?seksjon=abonnement' as Route}
      data-oppgrader-pille
      data-shell-enterprise
      className={`${skall} ${fyll}`}
    >
      <span className="pointer-events-none relative z-10 truncate md:text-[18px] md:font-[510] md:leading-[22px]">
        {tekst}
      </span>
    </Link>
  );
}
