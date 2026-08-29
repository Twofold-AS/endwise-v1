'use client';

import { Bike, ChevronRight, Sailboat } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { ForhandlerGrainientKort } from '../_shell/forhandler-grainient';
import { kjoretoyIkon } from '../_shell/forhandler-kort';
import { fmtTime } from '../bookinger/_status';

function KjoretoyMerke({ type }: { type: string | null | undefined }) {
  const kind = kjoretoyIkon(type);
  const Icon = kind === 'boat' ? Sailboat : Bike;
  const label = kind === 'boat' ? 'BÅT' : kind === 'atv' ? 'ATV' : 'MC';
  return (
    <span className="inline-flex h-control w-12 shrink-0 flex-col items-center justify-center rounded-control bg-surface-2 text-[10px] text-fg">
      <Icon size={14} strokeWidth={1.75} aria-hidden />
      <span>{label}</span>
    </span>
  );
}

/**
 * Dine jobber — én boks per jobb. Pil åpner eksisterende START / FERDIG.
 */
export function DineJobberFlate() {
  const kort = trpc.forhandler.kort.useQuery();
  const day = trpc.mechanic.myDay.useQuery();
  const jobs = day.data?.jobs ?? [];
  const forhandlernavn = kort.data?.name?.trim() || 'Forhandleren';

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-3 px-3 py-4 md:px-6 md:py-7">
      <ForhandlerGrainientKort />
      <p className="text-title text-fg" data-forhandlernavn>
        {forhandlernavn}
      </p>
      <h1 className="text-title text-fg">Dine jobber</h1>

      {day.isLoading ? <p className="text-[12px] text-fg-muted">Laster …</p> : null}
      {!day.isLoading && jobs.length === 0 ? (
        <p className="text-[12px] text-fg-muted">Ingen jobber i dag</p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {jobs.map((job) => (
          <li key={job.id}>
            <Link
              href={`/min-dag/${job.id}` as Route}
              className="flex h-row-store items-center gap-3 rounded-xl border border-border bg-card px-3 text-fg"
            >
              <span className="w-12 shrink-0 text-title tabular-nums">{fmtTime(job.startsAt)}</span>
              <KjoretoyMerke type={job.vehicleType} />
              <span className="min-w-0 flex-1 truncate text-title">
                {job.customerName ?? 'Ukjent kunde'}
              </span>
              <ChevronRight
                size={16}
                strokeWidth={1.75}
                className="shrink-0 text-fg-muted"
                aria-label="Detaljer"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
