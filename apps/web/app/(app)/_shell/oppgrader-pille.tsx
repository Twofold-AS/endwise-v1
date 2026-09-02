'use client';

import { oppgraderKnappetekst } from '@endwise/modules/billing/plans';
import { Galaxy } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';

/**
 * Oval Galaxy-knapp (React Bits, klippet inne i CTA). Svart `#111`.
 * Tekst følger TIERS-stigen. Lenke til Organisasjon › Abonnement.
 */
export function OppgraderPille() {
  const sub = trpc.billing.subscription.useQuery(undefined, { retry: false });
  const tekst = oppgraderKnappetekst(sub.data?.planKey ?? null);

  return (
    <Link
      href={'/organisasjon?seksjon=abonnement' as Route}
      data-oppgrader-pille
      className="relative mx-2 mb-1 flex h-9 items-center justify-center overflow-hidden rounded-full bg-[#111] px-4 text-label text-white"
    >
      <span className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
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
      <span className="relative z-10 truncate">{tekst}</span>
    </Link>
  );
}
