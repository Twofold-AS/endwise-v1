'use client';

import { Plus } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { osloKalenderdag } from '../_lib/oslo-dag';
import { TimeplanStripe } from '../_shell/timeplan-stripe';
import { TimeplanFlate } from '../mekanikere/kapasitet/page';
import { Kalender } from './_kalender';

/**
 * Timeplan. Liste = kapasitet (tidligere Organisasjon › Timeplan).
 * Kalender = jobber på valgt Oslo-dag med samme stripe som Liste.
 * Opprett jobb åpner /bookinger/ny. Salg er egen destinasjon, ikke en Timeplan-knapp.
 */
function TimeplanPageInner() {
  const params = useSearchParams();
  const visning = params?.get('visning') === 'kalender' ? 'kalender' : 'liste';
  const [valgt, setValgt] = useState(() => osloKalenderdag(new Date()));

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="text-title text-fg">Timeplan</h1>
        <p className="text-body text-fg-muted">
          Kapasitet og kalender for verkstedet. Samme dag og tid i Europe/Oslo.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link
            href={'/bookinger/ny' as Route}
            className="inline-flex h-control items-center gap-2 rounded-control bg-primary px-3.5 text-label text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus size={16} />
            Opprett jobb
          </Link>
        </div>
      </div>

      <TimeplanStripe valgt={valgt} onValgt={setValgt} />

      {visning === 'kalender' ? (
        <Kalender valgt={valgt} />
      ) : (
        <TimeplanFlate skjulPiller skjulStripe valgt={valgt} onValgt={setValgt} />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="px-8 py-7 text-body text-fg-muted">Laster timeplan …</div>}>
      <TimeplanPageInner />
    </Suspense>
  );
}
