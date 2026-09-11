'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useMdViewport } from '../_lib/use-md-viewport';
import { HJEM_SCROLL_FLATE, VERKSTED_INNHOLD } from '../_shell/phone-home';
import { DealerPulseKort, PhoneHomeDealer } from '../_shell/phone-home-dealer';
import { VerkstedetDag } from '../dashboard/_verkstedet-dag';

/**
 * Verkstedet (F3-05/F5-01) — forhandlerens landingsside.
 * Kanonisk rute er `/home`. `/dashboard` og `/verkstedet` er alias.
 * Mikael CODE-GO: fem flater på telefon og desktop B2.
 * Dag-flaten (`?visning=dag`) er uendret bak toppkort-tap. Chrome urørt.
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
 * Uten den faller /home og aliasene ut av prerender og `next build` feiler.
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
    <div
      className={`${HJEM_SCROLL_FLATE} ${VERKSTED_INNHOLD} flex h-full min-h-0 flex-col gap-2.5 py-3`}
    >
      <div className="sr-only">
        <h1>Verkstedet</h1>
        <p>Her er dagen din, sjef 👋</p>
        <p>Alt under er hentet fra dine egne saker.</p>
      </div>
      <DealerPulseKort className="flex flex-col gap-2.5" />
    </div>
  );
}
