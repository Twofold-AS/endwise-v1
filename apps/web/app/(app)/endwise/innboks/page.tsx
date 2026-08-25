'use client';

import { MessageSquare } from '@endwise/ui';
import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { NySamtale } from '../../innboks/_ny-samtale';

/**
 * F5-11 — tom flate når ingen henvendelse er valgt.
 * Lista (og tomtilstanden der) bor i innboks-sidebaren.
 * `?ny=1` åpner samme e-post-aktige compose som hos forhandleren.
 */
function EndwiseInnboksInner() {
  const router = useRouter();
  const params = useSearchParams();
  const nySamtale = params?.get('ny') === '1';

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="text-title text-fg">Innboks</h1>
        <p className="text-body text-fg-muted">
          Velg en henvendelse i lista til venstre for å svare.
        </p>
      </div>

      {nySamtale && <NySamtale onLukk={() => router.replace('/endwise/innboks' as Route)} />}

      {!nySamtale && (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <MessageSquare size={24} className="text-fg-muted" />
          <p className="max-w-sm text-[12px] text-fg-muted leading-relaxed">
            Når et verksted skriver til Endwise, lander det her.
          </p>
        </div>
      )}
    </div>
  );
}

export default function EndwiseInnboksPage() {
  return (
    <Suspense fallback={<div className="px-8 py-7 text-body text-fg-muted">Laster innboks …</div>}>
      <EndwiseInnboksInner />
    </Suspense>
  );
}
