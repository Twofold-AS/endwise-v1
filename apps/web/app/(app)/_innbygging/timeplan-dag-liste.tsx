'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { osloDagsvindu } from '../_lib/oslo-dag';
import { StatusMerke } from './status-merke';

const SORTER = [
  { id: 'tid', label: 'Tid' },
  { id: 'kunde', label: 'Kunde' },
  { id: 'status', label: 'Status' },
  { id: 'mekaniker', label: 'Mekaniker' },
] as const;

type SorterId = (typeof SORTER)[number]['id'];

function varighetMin(startsAt: Date | string, endsAt: Date | string): number {
  return Math.max(
    0,
    Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000),
  );
}

function tidLabel(startsAt: Date | string): string {
  return new Date(startsAt).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Claude Timeplan-dagsliste: flat, sorterbar, åpner jobbdetalj.
 */
export function TimeplanDagListe({ valgt }: { valgt: string }) {
  const vindu = osloDagsvindu(valgt);
  const kalender = trpc.bookings.calendar.useQuery({ from: vindu.from, to: vindu.to });
  const [sorter, setSorter] = useState<SorterId>('tid');

  const rader = useMemo(() => {
    const list = [...(kalender.data ?? [])].filter((j) => j.status !== 'cancelled');
    list.sort((a, b) => {
      if (sorter === 'kunde') {
        return (a.customerName ?? '').localeCompare(b.customerName ?? '', 'nb');
      }
      if (sorter === 'status') return a.status.localeCompare(b.status);
      if (sorter === 'mekaniker') {
        return (a.mechanicName ?? '').localeCompare(b.mechanicName ?? '', 'nb');
      }
      return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    });
    return list;
  }, [kalender.data, sorter]);

  return (
    <div data-timeplan-dag-liste className="flex flex-col gap-2">
      <fieldset className="flex flex-wrap gap-1.5 border-0 p-0">
        <legend className="sr-only">Sorter jobber</legend>
        {SORTER.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={sorter === s.id}
            onClick={() => setSorter(s.id)}
            className={`rounded-full px-3 py-1 text-[12px] ${
              sorter === s.id ? 'bg-fg text-bg' : 'bg-surface-2 text-fg-muted'
            }`}
          >
            {s.label}
          </button>
        ))}
      </fieldset>
      {kalender.isLoading ? (
        <p className="py-8 text-center text-[12px] text-fg-muted">Laster jobber …</p>
      ) : rader.length === 0 ? (
        <p className="py-8 text-center text-label text-fg-muted">Ingen jobber denne dagen.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rader.map((j) => (
            <li key={j.id}>
              <Link
                href={`/bookinger/${j.id}` as Route}
                className="flex flex-col gap-1 rounded-[24px] border border-divide bg-card px-4 py-3 shadow-none"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-label font-[650] text-fg tabular-nums">
                    {tidLabel(j.startsAt)}
                  </p>
                  <StatusMerke status={j.status} notes={j.notes} />
                </div>
                <p className="text-label text-fg">{j.customerName?.trim() || 'Uten kunde'}</p>
                <p className="text-[12px] text-fg-muted">
                  {[j.make, j.model, j.regNumber].filter(Boolean).join(' ') || 'Uten kjøretøy'}
                  {' · '}
                  {j.serviceName ?? 'Tjeneste'}
                  {' · '}
                  {j.mechanicName ?? 'Uten mekaniker'}
                  {' · '}
                  {varighetMin(j.startsAt, j.endsAt)} min
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
