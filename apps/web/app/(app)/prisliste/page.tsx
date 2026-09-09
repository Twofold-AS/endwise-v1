'use client';

import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { SideChromeSkall } from '../_shell/side-chrome-skall';
import { PrislisteFlate } from '../innstillinger/tjenestekatalog/_flate';
import { NyTjeneste } from '../innstillinger/tjenestekatalog/_ny-tjeneste';
import { parseTjenesterFane, TJENESTER_FANER, tjenesterHref } from './_faner';

/** Tjenester — bookbare tjenester. Chrome: Alle tjenester · Opprett tjenester. */
function TjenesterIndre() {
  const params = useSearchParams();
  const router = useRouter();
  const aktiv = parseTjenesterFane(params?.get('fane'));

  return (
    <SideChromeSkall
      tittel="Tjenester"
      ingress="Tjenestene kunden kan bestille hos dere."
      faner={TJENESTER_FANER.map((f) => ({ ...f, href: tjenesterHref(f.id) }))}
      aktiv={aktiv}
    >
      {aktiv === 'opprett' ? (
        <NyTjeneste onLukk={() => router.replace('/prisliste' as Route)} />
      ) : null}
      <PrislisteFlate skjulPiller tittel="Tjenester" skjulNy={aktiv === 'opprett'} />
    </SideChromeSkall>
  );
}

export default function TjenesterPage() {
  return (
    <Suspense
      fallback={<div className="px-8 py-7 text-body text-fg-muted">Laster tjenester …</div>}
    >
      <TjenesterIndre />
    </Suspense>
  );
}
