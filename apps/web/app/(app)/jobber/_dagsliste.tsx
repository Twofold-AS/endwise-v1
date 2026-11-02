'use client';

import { Clock } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { osloDagsvindu } from '../_lib/oslo-dag';
import { SorteringArk, SorteringGruppe, SorteringValg } from '../_shell/sortering-ark';
import { estMinutes, fmtTime, STATUS_LABEL } from '../bookinger/_status';
import {
  DAGSLISTE_SORTER,
  DAGSLISTE_SORTER_LABEL,
  type DagslisteSorter,
  sorterDagsliste,
} from './_sorter';

/**
 * Timeplan › dagsliste. Ekte `bookings.calendar` for valgt Oslo-dag.
 * Sortering er klient-side på allerede hentet data.
 */
export function TimeplanDagsliste({ valgt }: { valgt: string }) {
  const vindu = osloDagsvindu(valgt);
  const kalender = trpc.bookings.calendar.useQuery({ from: vindu.from, to: vindu.to });
  const [sorter, setSorter] = useState<DagslisteSorter>('tid');
  const [sorterApen, setSorterApen] = useState(false);
  const sorterRef = useRef<HTMLDivElement>(null);

  const rader = useMemo(() => {
    const aktive = (kalender.data ?? []).filter((j) => j.status !== 'cancelled');
    return sorterDagsliste(aktive, sorter);
  }, [kalender.data, sorter]);

  return (
    <div data-timeplan-dagsliste className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-body text-fg-muted">
          {kalender.isLoading
            ? 'Laster jobber …'
            : `${rader.length} ${rader.length === 1 ? 'jobb' : 'jobber'} denne dagen.`}
        </p>
        <div ref={sorterRef} className="relative">
          <button
            type="button"
            data-timeplan-sortering
            aria-expanded={sorterApen}
            aria-haspopup="true"
            aria-label="Sortering"
            onClick={() => setSorterApen((v) => !v)}
            className={`border-b-2 pb-1 text-label ${
              sorterApen ? 'border-fg font-[650] text-fg' : 'border-transparent text-fg-muted'
            }`}
          >
            {DAGSLISTE_SORTER_LABEL[sorter]}
          </button>
          <SorteringArk apen={sorterApen} onLukk={() => setSorterApen(false)} anker={sorterRef}>
            <SorteringGruppe>
              {DAGSLISTE_SORTER.map((key) => (
                <SorteringValg
                  key={key}
                  valgt={sorter === key}
                  onVelg={() => {
                    setSorter(key);
                    setSorterApen(false);
                  }}
                >
                  {DAGSLISTE_SORTER_LABEL[key]}
                </SorteringValg>
              ))}
            </SorteringGruppe>
          </SorteringArk>
        </div>
      </div>

      {kalender.isError ? (
        <p className="py-6 text-center text-body text-fg-muted">Kunne ikke hente jobbene.</p>
      ) : kalender.isLoading ? null : rader.length === 0 ? (
        <p data-timeplan-dag-tom className="py-8 text-center text-label text-fg-muted">
          Ingen jobber denne dagen.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rader.map((j) => (
            <li key={j.id}>
              <Link
                href={`/bookinger/${j.id}` as Route}
                data-timeplan-dag-rad={j.id}
                className="flex items-center gap-3 rounded-[16px] border border-divide bg-card px-4 py-3"
              >
                <span className="inline-flex w-12 shrink-0 items-center gap-1 text-label text-fg tabular-nums">
                  <Clock size={13} strokeWidth={1.75} className="text-fg-muted" />
                  {fmtTime(j.startsAt)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-label text-fg">{j.customerName ?? 'Ukjent kunde'}</p>
                  <p className="truncate text-[12px] text-fg-muted">
                    {j.serviceName ?? 'Jobb'}
                    {j.mechanicName ? ` · ${j.mechanicName}` : ''}
                    {` · ${estMinutes(j.startsAt, j.endsAt)} min`}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-surface-2 px-2 py-0.5 text-[10px] text-fg-muted">
                  {STATUS_LABEL[j.status] ?? j.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
