'use client';

import { LasterFlate, ListeRad, StatusChip, statusFraBooking } from '@endwise/ui';
import { useMemo, useRef, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { osloDagsvindu } from '../_lib/oslo-dag';
import { SorteringArk, SorteringGruppe, SorteringValg } from '../_shell/sortering-ark';
import { estMinutes, fmtTime } from '../bookinger/_status';
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
      ) : kalender.isLoading ? (
        <LasterFlate linjer={3} label="Henter jobber" />
      ) : rader.length === 0 ? (
        <p data-timeplan-dag-tom className="py-8 text-center text-label text-fg-muted">
          Ingen jobber denne dagen.
        </p>
      ) : (
        <ul className="flex flex-col">
          {rader.map((j) => (
            <li key={j.id} data-timeplan-dag-rad={j.id}>
              <ListeRad
                href={`/bookinger/${j.id}`}
                tittel={`${fmtTime(j.startsAt)} · ${j.customerName ?? 'Ukjent kunde'}`}
                undertekst={`${j.serviceName ?? 'Jobb'}${j.mechanicName ? ` · ${j.mechanicName}` : ''} · ${estMinutes(j.startsAt, j.endsAt)} min`}
                hoyre={<StatusChip status={statusFraBooking(j.status)} />}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
