'use client';

import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { osloKalenderdag } from '../_lib/oslo-dag';
import { SideChromeSkall } from '../_shell/side-chrome-skall';
import { TimeplanStripe } from '../_shell/timeplan-stripe';
import { TimeplanAvvik } from '../jobber/_avvik';
import { parseTimeplanFane, TIMEPLAN_FANER, timeplanHref } from '../jobber/_faner';
import { TimeplanForespor } from '../jobber/_forespor';
import { TimeplanFlate } from '../mekanikere/kapasitet/page';
import { Kalender } from './_kalender';

/**
 * Timeplan. Chrome: Timeplan · Opprett jobb · Avvik · Forespørsler.
 * Liste/kalender bor i Timeplan-fanen. Opprett jobb er /bookinger/ny.
 */
function TimeplanPageInner() {
  const params = useSearchParams();
  const router = useRouter();
  const aktiv = parseTimeplanFane('/jobber', params?.get('fane'));
  const visning = params?.get('visning') === 'kalender' ? 'kalender' : 'liste';
  const [valgt, setValgt] = useState(() => osloKalenderdag(new Date()));

  useEffect(() => {
    if (aktiv === 'opprett') router.replace('/bookinger/ny' as Route);
  }, [aktiv, router]);

  return (
    <SideChromeSkall
      tittel="Timeplan"
      ingress="Kapasitet, avvik og forespørsler. Samme dag og tid i Europe/Oslo."
      faner={TIMEPLAN_FANER.map((f) => ({ ...f, href: timeplanHref(f.id) }))}
      aktiv={aktiv}
    >
      {aktiv === 'avvik' ? <TimeplanAvvik /> : null}
      {aktiv === 'forespor' ? <TimeplanForespor /> : null}
      {aktiv === 'timeplan' ? (
        <div className="flex flex-col gap-5">
          <TimeplanStripe valgt={valgt} onValgt={setValgt} />
          {visning === 'kalender' ? (
            <Kalender valgt={valgt} />
          ) : (
            <TimeplanFlate skjulPiller skjulStripe valgt={valgt} onValgt={setValgt} />
          )}
        </div>
      ) : null}
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
