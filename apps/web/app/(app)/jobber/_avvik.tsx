'use client';

import { utdragEndring } from '@endwise/modules/booking/changes';
import type { Route } from 'next';
import Link from 'next/link';
import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { HJEM_PULSE_REFETCH } from '../_shell/hjem-pulse-sync';
import { AVVIK_NOTAT_PREFIKS, endringerVindu, harAvvikNotat } from '../_shell/phone-home-pulse';
import { TimeplanEndringDetalj } from './_endring-detalj';
import { endringerHref } from './_faner';

/**
 * Timeplan › Avvik — ekte `[AVVIK `-notat (F7-05).
 * Godkjenn/Avslå kaller `bookings.resolveChange`.
 */
export function TimeplanAvvik({ endringId }: { endringId?: string | null }) {
  const vindu = useMemo(() => endringerVindu(new Date()), []);
  const bookings = trpc.bookings.list.useQuery(
    { from: vindu.fra, to: vindu.til, limit: 200 },
    HJEM_PULSE_REFETCH,
  );

  const rader = (bookings.data ?? []).filter(
    (j) => j.status !== 'cancelled' && harAvvikNotat(j.notes),
  );
  const valgt = endringId ? rader.find((j) => j.id === endringId) : undefined;

  if (endringId && bookings.isLoading) {
    return <p className="py-8 text-center text-[12px] text-fg-muted">Laster avvik …</p>;
  }

  if (endringId && !valgt) {
    return (
      <div data-timeplan-avvik className="flex flex-col gap-3">
        <p className="py-8 text-center text-label text-fg-muted">Fant ikke ventende avvik.</p>
        <Link
          href={endringerHref('avvik') as Route}
          className="text-center text-[12px] text-fg-muted"
        >
          Tilbake til avvik
        </Link>
      </div>
    );
  }

  if (valgt) {
    return <TimeplanEndringDetalj jobb={valgt} kind="avvik" tilbake="avvik" />;
  }

  return (
    <div data-timeplan-avvik data-timeplan-endringer className="flex flex-col gap-4">
      <p className="text-[12px] text-fg-muted leading-relaxed">
        Avvik mekanikere logger på jobben. Telleren leser ekte{' '}
        <code className="text-fg">{AVVIK_NOTAT_PREFIKS.trim()}</code>-notat. Godkjenn og Avslå
        skriver tilbake via <code className="text-fg">bookings.resolveChange</code>.
      </p>

      {bookings.isLoading ? (
        <p className="py-8 text-center text-[12px] text-fg-muted">Laster avvik …</p>
      ) : rader.length === 0 ? (
        <p data-endringer-tom className="py-8 text-center text-label text-fg-muted">
          Ingen ventende avvik.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rader.map((j) => (
            <li key={j.id}>
              <Link
                href={endringerHref('avvik', j.id) as Route}
                data-endringer-rad={j.id}
                className="flex flex-col gap-2 rounded-[16px] border border-divide bg-card px-4 py-3"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="min-w-0 truncate text-label text-fg">
                    {j.serviceName ?? 'Jobb'}
                    {j.regNumber ? ` · ${j.regNumber}` : ''}
                  </p>
                  <span className="shrink-0 text-[11px] text-fg-muted">Avvik</span>
                </div>
                <p className="whitespace-pre-wrap text-[12px] text-fg-muted">
                  {utdragEndring(j.notes, 'avvik')}
                </p>
                <p className="text-[12px] text-fg-muted">
                  {j.mechanicName ? `Meldt · ${j.mechanicName}` : 'Åpne endring'}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
