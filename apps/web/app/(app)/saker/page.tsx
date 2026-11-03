'use client';

import { Side } from '@endwise/ui';
import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { osloKalenderdag } from '../_lib/oslo-dag';
import { OpprettSkuff } from '../_shell/opprett-skuff';
import { SideChromeSkall } from '../_shell/side-chrome-skall';
import { TimeplanStripe } from '../_shell/timeplan-stripe';
import { NyJobbSkjema } from '../bookinger/ny/page';
import { TimeplanDagsliste } from '../jobber/_dagsliste';
import { TimeplanEndringer } from '../jobber/_endringer';
import {
  parseEndringerDel,
  parseTimeplanFane,
  TIMEPLAN_FANER,
  timeplanHref,
} from '../jobber/_faner';
import { Kalender } from './_kalender';

/**
 * Timeplan. Chrome: Timeplan · Opprett jobb · Endringer.
 * Endringer lister Avvik og Forespørsler med Innstillinger-inndeling.
 */
function TimeplanPageInner() {
  const params = useSearchParams();
  const router = useRouter();
  const aktiv = parseTimeplanFane('/jobber', params?.get('fane'));
  const endringerDel = parseEndringerDel('/jobber', params?.get('fane'));
  const endringId = params?.get('endring');
  const visning = params?.get('visning') === 'kalender' ? 'kalender' : 'liste';
  const [valgt, setValgt] = useState(() => osloKalenderdag(new Date()));

  useEffect(() => {
    if (aktiv === 'opprett' && typeof window !== 'undefined') {
      const desktop = window.matchMedia('(min-width: 768px)').matches;
      if (desktop) router.replace('/bookinger/ny' as Route);
    }
  }, [aktiv, router]);

  return (
    <SideChromeSkall
      tittel="Timeplan"
      ingress="Jobber per dag. Samme dag og tid i Europe/Oslo."
      faner={TIMEPLAN_FANER.map((f) => ({ ...f, href: timeplanHref(f.id) }))}
      aktiv={aktiv}
    >
      <Side tittel="Timeplan" className="[&>header]:sr-only max-md:px-0">
        {aktiv === 'endringer' ? (
          <TimeplanEndringer del={endringerDel} endringId={endringId} />
        ) : null}
        {aktiv === 'timeplan' || aktiv === 'opprett' ? (
          <div className="flex flex-col gap-5">
            <TimeplanStripe valgt={valgt} onValgt={setValgt} />
            {visning === 'kalender' ? (
              <Kalender valgt={valgt} />
            ) : (
              <TimeplanDagsliste valgt={valgt} />
            )}
          </div>
        ) : null}
        {aktiv === 'opprett' ? (
          <OpprettSkuff
            tittel="Opprett jobb"
            apen
            onLukk={() => router.replace('/jobber' as Route)}
          >
            <NyJobbSkjema onFerdig={() => router.replace('/jobber' as Route)} />
          </OpprettSkuff>
        ) : null}
      </Side>
    </SideChromeSkall>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="px-8 py-7 text-body text-fg-muted">Laster timeplan …</div>}>
      <TimeplanPageInner />
    </Suspense>
  );
}
