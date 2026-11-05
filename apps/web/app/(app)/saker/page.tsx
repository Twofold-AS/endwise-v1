'use client';

import { LasterFlate, Side } from '@endwise/ui';
import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { osloKalenderdag } from '../_lib/oslo-dag';
import { NyKnapp, useNyHandling } from '../_shell/ny-handling';
import { OpprettSkuff } from '../_shell/opprett-skuff';
import { MobilSideBunn } from '../_shell/pulse-kort';
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
 * Timeplan. Desktop-chrome: Timeplan · Opprett jobb · Endringer.
 * Mobil: Ny-knapp åpner skuff. ?fane=opprett / ?ny=1 strippes.
 */
function TimeplanPageInner() {
  const params = useSearchParams();
  const router = useRouter();
  const aktiv = parseTimeplanFane('/jobber', params?.get('fane'));
  const endringerDel = parseEndringerDel('/jobber', params?.get('fane'));
  const endringId = params?.get('endring');
  const visning = params?.get('visning') === 'kalender' ? 'kalender' : 'liste';
  const [valgt, setValgt] = useState(() => osloKalenderdag(new Date()));
  const ny = useNyHandling();
  const nyJobb = aktiv === 'opprett' || ny.apen;

  useEffect(() => {
    if (aktiv === 'opprett' && typeof window !== 'undefined') {
      const desktop = window.matchMedia('(min-width: 768px)').matches;
      if (desktop) router.replace('/bookinger/ny' as Route);
    }
  }, [aktiv, router]);

  function lukkNy() {
    ny.lukk();
    router.replace('/jobber' as Route);
  }

  return (
    <SideChromeSkall
      tittel="Timeplan"
      ingress="Jobber per dag. Samme dag og tid i Europe/Oslo."
      faner={TIMEPLAN_FANER.map((f) => ({ ...f, href: timeplanHref(f.id) }))}
      aktiv={aktiv === 'opprett' ? 'timeplan' : aktiv}
    >
      <Side
        tittel="Timeplan"
        undertekst="Jobber per dag."
        handling={<NyKnapp onClick={ny.apne}>Ny jobb</NyKnapp>}
        className="max-md:px-0"
      >
        {aktiv === 'endringer' ? (
          <TimeplanEndringer del={endringerDel} endringId={endringId} />
        ) : null}
        {aktiv === 'timeplan' || aktiv === 'opprett' || nyJobb ? (
          <div className="flex flex-col gap-5">
            <TimeplanStripe valgt={valgt} onValgt={setValgt} />
            {visning === 'kalender' ? (
              <Kalender valgt={valgt} />
            ) : (
              <TimeplanDagsliste valgt={valgt} />
            )}
          </div>
        ) : null}
        {nyJobb ? (
          <OpprettSkuff tittel="Opprett jobb" apen onLukk={lukkNy}>
            <NyJobbSkjema onFerdig={lukkNy} />
          </OpprettSkuff>
        ) : null}
        <MobilSideBunn />
      </Side>
    </SideChromeSkall>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LasterFlate label="Henter timeplan" />}>
      <TimeplanPageInner />
    </Suspense>
  );
}
