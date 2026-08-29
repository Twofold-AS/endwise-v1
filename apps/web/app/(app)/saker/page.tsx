'use client';

import { Dialog, DialogContent, DialogDescription, DialogTitle, Plus } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { osloKalenderdag } from '../_lib/oslo-dag';
import { SidePiller } from '../_shell/side-piller';
import { TimeplanStripe } from '../_shell/timeplan-stripe';
import { PrislisteFlate } from '../innstillinger/tjenestekatalog/_flate';
import { TimeplanFlate } from '../mekanikere/kapasitet/page';
import { Kalender } from './_kalender';

/**
 * Timeplan. Liste = kapasitet (tidligere Organisasjon › Timeplan).
 * Kalender = jobber på valgt Oslo-dag med samme stripe som Liste.
 * Prisliste er popup, ikke egen side. Opprett jobb åpner /bookinger/ny.
 */
function TimeplanPageInner() {
  const params = useSearchParams();
  const visning = params?.get('visning') === 'kalender' ? 'kalender' : 'liste';
  const [valgt, setValgt] = useState(() => osloKalenderdag(new Date()));
  const [prislisteApen, setPrislisteApen] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="text-title text-fg">Timeplan</h1>
        <p className="text-body text-fg-muted">
          Kapasitet og kalender for verkstedet. Samme dag og tid i Europe/Oslo.
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <SidePiller
          ariaLabel="Timeplan"
          piller={[
            { label: 'Liste', href: '/jobber' },
            { label: 'Kalender', href: '/jobber?visning=kalender' },
          ]}
          aktivHref={visning === 'kalender' ? '/jobber?visning=kalender' : '/jobber'}
        />
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={'/bookinger/ny' as Route}
            className="inline-flex h-control items-center gap-2 rounded-control bg-primary px-3.5 text-label text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus size={16} />
            Opprett jobb
          </Link>
          <button
            type="button"
            onClick={() => setPrislisteApen(true)}
            className="inline-flex h-control items-center rounded-control border border-border px-3.5 text-label text-fg transition-colors hover:bg-surface-2"
          >
            Prisliste
          </button>
        </div>
      </div>

      <TimeplanStripe valgt={valgt} onValgt={setValgt} />

      {visning === 'kalender' ? (
        <Kalender valgt={valgt} />
      ) : (
        <TimeplanFlate skjulPiller skjulStripe valgt={valgt} onValgt={setValgt} />
      )}

      <Dialog open={prislisteApen} onOpenChange={setPrislisteApen}>
        <DialogContent className="top-1/2 left-1/2 max-h-[min(90dvh,800px)] w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-5">
          <DialogTitle className="sr-only">Prisliste</DialogTitle>
          <DialogDescription className="sr-only">
            Tjenestene kunden kan bestille, med varighet og pris.
          </DialogDescription>
          <PrislisteFlate skjulPiller tittel="Prisliste" />
        </DialogContent>
      </Dialog>
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
