'use client';

import { LasterFlate } from '@endwise/ui';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useMdViewport } from '../_lib/use-md-viewport';
import { PhoneHomeDealer } from '../_shell/phone-home-dealer';
import { VerkstedetDag } from '../dashboard/_verkstedet-dag';
import { VerkstedetDesktopBred } from './_desktop-hjem';

/**
 * Verkstedet (F3-05/F5-01) — forhandlerens landingsside.
 * Kanonisk rute er `/home`. `/dashboard` og `/verkstedet` er alias.
 * Claude-designet: samme kortrekkefølge på telefon og desktop —
 * toppkort · Analyse · Innboks · Lager · På jobb + Ny Jobb.
 * Dag-flaten (`?visning=dag`) er uendret bak toppkort-tap på telefon.
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
  return <VerkstedetDesktopBred />;
}
