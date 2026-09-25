'use client';

import { utdragEndring } from '@endwise/modules/booking/changes';
import type { Route } from 'next';
import Link from 'next/link';
import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { HJEM_PULSE_REFETCH } from '../_shell/hjem-pulse-sync';
import { endringerVindu, harVentendeForespor } from '../_shell/phone-home-pulse';
import { TimeplanEndringDetalj } from './_endring-detalj';
import { endringerHref } from './_faner';

/**
 * Timeplan › Forespørsler — ekte `[FORESPOR `-notat via bookings.reportChange.
 * Ekstra tid på Min dag uten notat vises ikke.
 */
export function TimeplanForespor({ endringId }: { endringId?: string | null }) {
  const vindu = useMemo(() => endringerVindu(new Date()), []);
  const bookings = trpc.bookings.list.useQuery(
    { from: vindu.fra, to: vindu.til, limit: 200 },
    HJEM_PULSE_REFETCH,
  );

  const rader = (bookings.data ?? []).filter(
    (j) => j.status !== 'cancelled' && harVentendeForespor(j.notes),
  );
  const valgt = endringId ? rader.find((j) => j.id === endringId) : undefined;

  if (endringId && bookings.isLoading) {
    return <p className="py-8 text-center text-[12px] text-fg-muted">Laster forespørsler …</p>;
  }

  if (endringId && !valgt) {
    return (
      <div data-timeplan-forespor className="flex flex-col gap-3">
        <p className="py-8 text-center text-label text-fg-muted">Fant ikke ventende forespørsel.</p>
        <Link
          href={endringerHref('forespor') as Route}
          className="text-center text-[12px] text-fg-muted"
        >
          Tilbake til forespørsler
        </Link>
      </div>
    );
  }

  if (valgt) {
    return <TimeplanEndringDetalj jobb={valgt} kind="forespor" tilbake="forespor" />;
  }

  return (
    <div data-timeplan-forespor className="flex flex-col gap-3">
      <p className="text-body text-fg-muted">
        Forespørsler om tid og endring på jobben. Listen leser ekte{' '}
        <code className="text-fg">[FORESPOR</code>-notat. Ekstra tid fra Min dag uten notat vises
        ikke.
      </p>
      {bookings.isLoading ? (
        <p className="py-8 text-center text-label text-fg-muted">Laster forespørsler …</p>
      ) : rader.length === 0 ? (
        <p data-endringer-tom className="py-8 text-center text-label text-fg-muted">
          Ingen ventende forespørsler.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rader.map((j) => (
            <li key={j.id}>
              <Link
                href={endringerHref('forespor', j.id) as Route}
                data-endringer-rad={j.id}
                className="flex flex-col gap-2 rounded-[16px] border border-divide bg-card px-4 py-3"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="min-w-0 truncate text-label text-fg">
                    {j.serviceName ?? 'Jobb'}
                    {j.regNumber ? ` · ${j.regNumber}` : ''}
                  </p>
                  <span className="shrink-0 text-[11px] text-fg-muted">Forespørsel</span>
                </div>
                <p className="whitespace-pre-wrap text-[12px] text-fg-muted">
                  {utdragEndring(j.notes, 'forespor')}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
