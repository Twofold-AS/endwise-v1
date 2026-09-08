'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { SideChromeSkall } from '../_shell/side-chrome-skall';
import { HjelpArtikler } from './_artikler';
import { HJELP_FANER, hjelpHref, parseHjelpFane } from './_faner';
import { HjelpForespor } from './_forespor';

export function HjelpSkall() {
  return (
    <Suspense fallback={<div className="px-8 py-7 text-body text-fg-muted">Laster hjelp …</div>}>
      <HjelpSkallIndre />
    </Suspense>
  );
}

function HjelpSkallIndre() {
  const params = useSearchParams();
  const aktiv = parseHjelpFane(params?.get('fane'));
  const kategori = params?.get('kategori');

  return (
    <SideChromeSkall
      tittel="Hjelp"
      ingress="Artikler og forespørsler til Endwise."
      faner={HJELP_FANER.map((f) => ({ ...f, href: hjelpHref(f.id) }))}
      aktiv={aktiv}
    >
      {aktiv === 'forespor' ? <HjelpForespor /> : <HjelpArtikler startKategori={kategori} />}
    </SideChromeSkall>
  );
}
