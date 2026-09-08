'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { SideChromeSkall } from '../_shell/side-chrome-skall';
import { parseStatistikkFane, STATISTIKK_FANER, statistikkHref } from './_faner';
import { StatistikkInnhold } from './_innhold';

export function StatistikkSkall() {
  return (
    <Suspense
      fallback={<div className="px-8 py-7 text-body text-fg-muted">Laster statistikk …</div>}
    >
      <StatistikkSkallIndre />
    </Suspense>
  );
}

function StatistikkSkallIndre() {
  const params = useSearchParams();
  const aktiv = parseStatistikkFane(params?.get('fane'));

  return (
    <SideChromeSkall
      tittel="Statistikk"
      ingress="Tall for uken. Nettsidevisninger når data finnes — ellers mock."
      faner={STATISTIKK_FANER.map((f) => ({ ...f, href: statistikkHref(f.id) }))}
      aktiv={aktiv}
    >
      <StatistikkInnhold fane={aktiv} />
    </SideChromeSkall>
  );
}
