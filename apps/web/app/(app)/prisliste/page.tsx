'use client';

import { LasterFlate } from '@endwise/ui';
import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useNyHandling } from '../_shell/ny-handling';
import { SideChromeSkall } from '../_shell/side-chrome-skall';
import { PrislisteFlate } from '../innstillinger/tjenestekatalog/_flate';
import { NyTjeneste } from '../innstillinger/tjenestekatalog/_ny-tjeneste';
import { parseTjenesterFane, TJENESTER_FANER, tjenesterHref } from './_faner';

/** Tjenester — bookbare tjenester. Mobil: Ny-knapp, ikke Opprett-fane. */
function TjenesterIndre() {
  const params = useSearchParams();
  const router = useRouter();
  const aktiv = parseTjenesterFane(params?.get('fane'));
  const ny = useNyHandling();

  function lukkNy() {
    ny.lukk();
    router.replace('/prisliste' as Route);
  }

  return (
    <SideChromeSkall
      tittel="Tjenester"
      ingress="Tjenestene kunden kan bestille hos dere."
      faner={TJENESTER_FANER.map((f) => ({ ...f, href: tjenesterHref(f.id) }))}
      aktiv={aktiv === 'opprett' ? 'alle' : aktiv}
    >
      <NyTjeneste apen={aktiv === 'opprett' || ny.apen} onLukk={lukkNy} />
      <PrislisteFlate skjulPiller tittel="Tjenester" onNy={ny.apne} />
    </SideChromeSkall>
  );
}

export default function TjenesterPage() {
  return (
    <Suspense fallback={<LasterFlate label="Henter tjenester" />}>
      <TjenesterIndre />
    </Suspense>
  );
}
