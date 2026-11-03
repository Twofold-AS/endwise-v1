'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useMdViewport } from '../_lib/use-md-viewport';
import { LasterFlate, Side } from '@endwise/ui';
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
    return <LasterFlate label="Henter dagen din" />;
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
    <Suspense fallback={<LasterFlate label="Henter dagen din" />}>
      <VerkstedetPageInner />
    </Suspense>
  );
}

function VerkstedetDesktop() {
  return (
    <Side
      tittel="Dagen din"
      undertekst="Her er det som gjelder i dag."
      className={`${HJEM_SCROLL_FLATE} ${VERKSTED_INNHOLD} py-3`}
    >
      <DealerPulseKort className="flex flex-col gap-4" />
    </Side>
  );
}
