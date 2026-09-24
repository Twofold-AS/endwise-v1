'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { ClaudePageHead } from '../_shell/claude-flate';
import { PulseTallKort } from '../_shell/pulse-kort';
import { tallCeller, tallVindu } from '../_shell/phone-home-pulse';

/**
 * Tall — Claude 2×2 (erstatter Analyse / Rapporter).
 * Bookinger er ekte 30d. Visninger / returer / credits er ærlig stub.
 */
function TallPageInner() {
  const params = useSearchParams();
  const visning = params?.get('visning') === 'direkte' ? 'direkte' : 'tall';
  const vindu = useMemo(() => tallVindu(new Date()), []);
  const bookings = trpc.bookings.list.useQuery({
    from: vindu.fra,
    to: vindu.til,
    limit: 200,
  });
  const celler = tallCeller(bookings.data ?? [], new Date());

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5 px-8 py-7">
      <ClaudePageHead
        title="Tall"
        sub="Siste 30 dager. Bookinger fra jobbene. Visninger og returer når de er tilkoblet."
      />

      {visning === 'direkte' ? (
        <p className="text-[15px] text-fg-muted">
          Live-besøk er ikke tilkoblet her. Bruk Marked › Live når den er åpen.
        </p>
      ) : bookings.isLoading ? (
        <div className="h-40 animate-pulse rounded-[24px] bg-surface-2" />
      ) : (
        <>
          <PulseTallKort celler={celler} href="/statistikk" />
          {(bookings.data?.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-[24px] border border-divide bg-card px-8 py-12 text-center">
              <p className="text-label text-fg">Ingen rapporter ennå</p>
              <p className="max-w-md text-[15px] text-fg-muted">
                Bookinger fylles når verkstedet har ekte jobber. Visninger og returer er ikke
                tilkoblet — vi viser ikke oppdiktede tall.
              </p>
              <Link
                href={'/bookinger/ny' as Route}
                className="inline-flex h-10 items-center rounded-full bg-fg px-4 text-[15px] text-bg"
              >
                Ny jobb
              </Link>
            </div>
          ) : (
            <p className="text-[13px] text-fg-muted leading-relaxed">
              Bookinger er live. Visninger, returer og credits venter på API.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="px-8 py-7 text-body text-fg-muted">Laster tall …</div>}>
      <TallPageInner />
    </Suspense>
  );
}
