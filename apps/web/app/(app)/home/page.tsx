'use client';

import { LasterFlate, ListeRad, Seksjon } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { sammeOsloDag } from '../_lib/oslo-dag';
import { useMdViewport } from '../_lib/use-md-viewport';
import { HJEM_SCROLL_FLATE, VERKSTED_INNHOLD } from '../_shell/phone-home';
import { DealerPulseKort, PhoneHomeDealer } from '../_shell/phone-home-dealer';
import { fmtTime, STATUS_LABEL } from '../bookinger/_status';
import { VerkstedetDag } from '../dashboard/_verkstedet-dag';

/**
 * Verkstedet (F3-05/F5-01) — forhandlerens landingsside.
 * Kanonisk rute er `/home`. `/dashboard` og `/verkstedet` er alias.
 * Mikael CODE-GO: fem flater på telefon og desktop B2.
 * Dag-flaten (`?visning=dag`) er uendret bak toppkort-tap. Chrome urørt.
 */
function VerkstedetPageInner() {
  const search = useSearchParams();
  const dag = search?.get('visning') === 'dag';
  const flate = useMdViewport();

  if (flate === null) {
    return <LasterFlate label="Henter dagen din" />;
  }
  if (flate === 'desktop') return <VerkstedetDesktop />;
  return dag ? <VerkstedetDag /> : <PhoneHomeDealer />;
}

/**
 * Suspense-grense er påkrevd: siden leser `useSearchParams` (?visning=dag).
 * Uten den faller /home og aliasene ut av prerender og `next build` feiler.
 */
export default function VerkstedetPage() {
  return (
    <Suspense fallback={<LasterFlate label="Henter dagen din" />}>
      <VerkstedetPageInner />
    </Suspense>
  );
}

function VerkstedetDesktop() {
  return (
    <div
      className={`${HJEM_SCROLL_FLATE} ${VERKSTED_INNHOLD} flex h-full min-h-0 flex-col gap-2.5 py-3`}
    >
      <div className="sr-only">
        <h1>Verkstedet</h1>
        <p>Her er dagen din, sjef 👋</p>
        <p>Alt under er hentet fra dine egne saker.</p>
      </div>
      <DealerPulseKort className="flex flex-col gap-2.5" />
      <VerkstedetDagsplan />
    </div>
  );
}

function VerkstedetDagsplan() {
  const bookings = trpc.bookings.list.useQuery({ limit: 100 });
  const naa = useMemo(() => new Date(), []);
  const rader = useMemo(
    () =>
      (bookings.data ?? [])
        .filter((b) => sammeOsloDag(b.startsAt, naa))
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [bookings.data, naa],
  );

  return (
    <section data-dagens-timeplan className="flex flex-col gap-2">
      <Seksjon tittel="Dagens timeplan">
        <Link
          href={'/jobber' as Route}
          className="inline-flex h-11 items-center text-[16px] text-fg underline underline-offset-2"
        >
          Åpne timeplan
        </Link>
        {bookings.isLoading ? <LasterFlate label="Henter timeplanen" /> : null}
        {!bookings.isLoading && rader.length === 0 ? (
          <p className="text-body text-fg-muted">Ingen jobber i dag.</p>
        ) : null}
        {rader.map((b) => (
          <ListeRad
            key={b.id}
            tittel={`${fmtTime(b.startsAt)} · ${b.regNumber ?? 'Uten regnr'}`}
            undertekst={`${STATUS_LABEL[b.status] ?? b.status}${
              b.mechanicName ? ` · ${b.mechanicName}` : ''
            }`}
            href={`/bookinger/${b.id}`}
          />
        ))}
      </Seksjon>
    </section>
  );
}
