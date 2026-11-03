'use client';

import { endringKindFraNotat, utdragEndring } from '@endwise/modules/booking/changes';
import type { Route } from 'next';
import Link from 'next/link';
import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { HJEM_PULSE_REFETCH } from '../_shell/hjem-pulse-sync';
import { endringerVindu, harBehandletEndring } from '../_shell/phone-home-pulse';
import { TimeplanEndringDetalj } from './_endring-detalj';
import { endringerHref } from './_faner';

/**
 * Timeplan › Logg — behandlede avvik/forespørsler.
 * Tom når ingen `[AVVIK-BEHANDLET` / `[FORESPOR-BEHANDLET` finnes.
 */
export function TimeplanLogg({ endringId }: { endringId?: string | null }) {
  const vindu = useMemo(() => endringerVindu(new Date()), []);
  const bookings = trpc.bookings.list.useQuery(
    { from: vindu.fra, to: vindu.til, limit: 200 },
    HJEM_PULSE_REFETCH,
  );

  const rader = (bookings.data ?? []).filter(
    (j) => j.status !== 'cancelled' && harBehandletEndring(j.notes),
  );
  const valgt = endringId ? rader.find((j) => j.id === endringId) : undefined;

  if (endringId && bookings.isLoading) {
    return <p className="py-8 text-center text-[12px] text-fg-muted">Laster logg …</p>;
  }

  if (endringId && !valgt) {
    return (
      <div data-timeplan-logg className="flex flex-col gap-3">
        <p className="py-8 text-center text-label text-fg-muted">Fant ikke behandlet endring.</p>
        <Link
          href={endringerHref('logg') as Route}
          className="text-center text-[12px] text-fg-muted"
        >
          Tilbake til logg
        </Link>
      </div>
    );
  }

  if (valgt) {
    return (
      <TimeplanEndringDetalj jobb={valgt} kind={endringKindFraNotat(valgt.notes)} tilbake="logg" />
    );
  }

  return (
    <div data-timeplan-logg className="flex flex-col gap-3">
      <p className="text-body text-fg-muted">
        Behandlede avvik og forespørsler. Listen vises bare når noen har godkjent eller avslått.
      </p>
      {bookings.isLoading ? (
        <p className="py-8 text-center text-label text-fg-muted">Laster logg …</p>
      ) : rader.length === 0 ? (
        <p data-endringer-tom className="py-8 text-center text-label text-fg-muted">
          Ingen behandlede endringer ennå.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rader.map((j) => {
            const kind = endringKindFraNotat(j.notes);
            return (
              <li key={j.id}>
                <Link
                  href={endringerHref('logg', j.id) as Route}
                  data-endringer-rad={j.id}
                  className="flex flex-col gap-2 rounded-[16px] border border-divide bg-card px-4 py-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="min-w-0 truncate text-label text-fg">
                      {j.serviceName ?? 'Jobb'}
                      {j.regNumber ? ` · ${j.regNumber}` : ''}
                    </p>
                    <span className="shrink-0 text-[11px] text-fg-muted">
                      {kind === 'forespor' ? 'Forespørsel' : 'Avvik'}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-[12px] text-fg-muted">
                    {utdragEndring(j.notes, kind)}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
