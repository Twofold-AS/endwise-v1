'use client';

import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { KunderListe } from '../_innbygging/kunder-liste';
import { SideChromeSkall } from '../_shell/side-chrome-skall';
import { KUNDER_FANER, kunderHref, parseKunderFane } from './_faner';
import { NyKunde } from './_ny-kunde';
import { RegistrerKjoretoy } from './_registrer-kjoretoy';

/**
 * Kunder — Claude-liste (alfa, pager, Ny) under eksisterende chrome.
 * Top-bar 1+2 / KUNDER_FANER urørt.
 */
function KunderInner() {
  const params = useSearchParams();
  const router = useRouter();
  const aktiv = parseKunderFane('/kunder', params?.get('fane'), params?.get('ny'));

  return (
    <SideChromeSkall
      tittel="Kunder"
      ingress="Søk, opprett og endre kunder. Quick er fakta når det er koblet på."
      faner={KUNDER_FANER.map((f) => ({ ...f, href: kunderHref(f.id) }))}
      aktiv={aktiv}
    >
      {aktiv === 'opprett' ? <NyKunde onLukk={() => router.replace('/kunder' as Route)} /> : null}
      {aktiv === 'kjoretoy' ? <RegistrerKjoretoy /> : null}
      {aktiv === 'alle' ? <KunderListe /> : null}
    </SideChromeSkall>
  );
}

/** Suspense-grense er PÅKREVD: siden leser `useSearchParams()` (?sok=). */
export default function Page() {
  return (
    <Suspense fallback={<div className="px-8 py-7 text-body text-fg-muted">Laster kunder …</div>}>
      <KunderInner />
    </Suspense>
  );
}
