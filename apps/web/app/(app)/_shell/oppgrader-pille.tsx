'use client';

import { oppgraderKnappetekst } from '@endwise/modules/billing/plans';
import { Grainient } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';

/**
 * Erstatter TipCard/Hjelp-slider. Oval Grainient-knapp (samme familie som
 * KI-Ronny-stripen, ikke ShaderGradient). Tekst følger TIERS-stigen.
 * Enterprise = «Enterprise». Lenke til Organisasjon › Abonnement.
 */
export function OppgraderPille() {
  const sub = trpc.billing.subscription.useQuery(undefined, { retry: false });
  const tekst = oppgraderKnappetekst(sub.data?.planKey ?? null);

  return (
    <Link
      href={'/organisasjon?seksjon=abonnement' as Route}
      data-oppgrader-pille
      className="relative mx-2 mb-1 flex h-9 items-center justify-center overflow-hidden rounded-full px-4 text-label text-white"
    >
      <span className="pointer-events-none absolute inset-0" aria-hidden>
        <Grainient className="absolute inset-0 h-full w-full" />
      </span>
      <span className="relative z-10 truncate">{tekst}</span>
    </Link>
  );
}
