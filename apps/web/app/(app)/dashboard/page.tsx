'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useMdViewport } from '../_lib/use-md-viewport';
import { VERKSTED_INNHOLD } from '../_shell/phone-home';
import { DealerDestinasjonskort, PhoneHomeDealer } from '../_shell/phone-home-dealer';
import { VerkstedetDag } from './_verkstedet-dag';

/**
 * Verkstedet (F3-05/F5-01) — forhandlerens landingsside.
 * Jonas Apple-hjem 05.09: destinasjonskort (hero + 2-og-2) på telefon og
 * desktop. Dag-flaten (`?visning=dag`) er uendret bak hero-tap.
 */
function VerkstedetPageInner() {
  const search = useSearchParams();
  const dag = search?.get('visning') === 'dag';
  const flate = useMdViewport();

  if (flate === null) {
    return <div className="px-8 py-7 text-body text-fg-muted">Laster verkstedet …</div>;
  }
  if (flate === 'desktop') return <VerkstedetDesktop />;
  return dag ? <VerkstedetDag /> : <PhoneHomeDealer />;
}

/**
 * Suspense-grense er påkrevd: siden leser `useSearchParams` (?visning=dag).
 * Uten den faller /dashboard og aliaset /verkstedet ut av prerender
 * og `next build` feiler.
 */
export default function VerkstedetPage() {
  return (
    <Suspense
      fallback={<div className="px-8 py-7 text-body text-fg-muted">Laster verkstedet …</div>}
    >
      <VerkstedetPageInner />
    </Suspense>
  );
}

function VerkstedetDesktop() {
  return (
    <div className={`${VERKSTED_INNHOLD} flex flex-col gap-5 py-7`}>
      <div className="sr-only">
        <h1>Verkstedet</h1>
        <p>Her er dagen din, sjef 👋</p>
        <p>Alt under er hentet fra dine egne saker.</p>
      </div>
      <DealerDestinasjonskort className="flex flex-col gap-4" />
    </div>
  );
}
