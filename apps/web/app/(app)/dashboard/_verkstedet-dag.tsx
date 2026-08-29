'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { fmtServices, fmtTime, STATUS_LABEL } from '../bookinger/_status';
import { Timeplan } from './_timeplan';

/**
 * Telefon: inne i Verkstedet. Dagen som jobbkort.
 * Book for kunde er merkelapp på jobbkortet — ingen gjeste-booking her.
 * Kalender nederst (ikke Timeplan — det navnet er destinasjonskortet).
 */
export function VerkstedetDag() {
  const bookings = trpc.bookings.list.useQuery({ limit: 100 });
  const mechanics = trpc.mechanics.list.useQuery();
  const naa = useMemo(() => new Date(), []);

  const mekName = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of mechanics.data ?? []) m.set(x.id, x.name);
    return m;
  }, [mechanics.data]);

  const rader = useMemo(() => {
    return (bookings.data ?? [])
      .filter((b) => new Date(b.startsAt).toDateString() === naa.toDateString())
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [bookings.data, naa]);

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col gap-4 px-3 py-3 md:hidden">
      <h1 className="sr-only">Verkstedet</h1>

      {bookings.isLoading ? <p className="text-[12px] text-fg-muted">Laster …</p> : null}

      {!bookings.isLoading && rader.length === 0 ? (
        <div className="rounded-xl bg-accent p-4 text-accent-fg">
          <p className="text-title">Ingen jobber i dag</p>
          <Link
            href={'/bookinger/ny' as Route}
            className="mt-3 inline-flex h-control items-center rounded-control bg-accent-fg px-3 text-label text-accent"
          >
            Ny jobb
          </Link>
        </div>
      ) : null}

      {rader.map((b) => (
        <article key={b.id} className="flex flex-col gap-3 rounded-xl bg-accent p-3 text-accent-fg">
          <Link href={`/bookinger/${b.id}` as Route} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-title tabular-nums">{fmtTime(b.startsAt)}</span>
              <span className="min-w-0 flex-1 truncate text-title">
                {b.regNumber ?? 'Uten regnr'}
              </span>
            </div>
            <p className="text-[12px] opacity-90">
              {fmtServices(b)} · {mekName.get(b.mechanicId) ?? b.mechanicName ?? '—'} ·{' '}
              {STATUS_LABEL[b.status] ?? b.status}
            </p>
          </Link>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex h-control items-center rounded-control bg-accent-fg px-3 text-label text-accent"
            >
              Book for kunde
            </button>
            <Link
              href={'/bookinger/ny' as Route}
              className="inline-flex h-control items-center rounded-control bg-accent-fg/15 px-3 text-label"
            >
              Ny jobb
            </Link>
          </div>
        </article>
      ))}

      <Timeplan
        tittel="Kalender"
        jobber={bookings.data}
        mekName={mekName}
        laster={bookings.isLoading}
        feil={bookings.isError ? bookings.error.message : undefined}
      />
    </div>
  );
}
