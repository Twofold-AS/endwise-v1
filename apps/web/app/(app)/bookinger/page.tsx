'use client';

import { CalendarCheck, Plus, Search, Wrench } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../_shell/cards';
import { ALL_STATUSES, fmtDateTime, fmtMinor, STATUS_LABEL, STATUS_TONE } from './_status';

/**
 * F3-06 — Bookinger (forhandler). EKTE data fra `bookings.list` (RLS-scopet til
 * innlogget tenant). Liste → detalj → status er mønsteret kunder/kjøretøy/tjenester
 * skal arve. Søk (kunde/regnr/notat) + filtre (status, mekaniker).
 */
export default function BookingerPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [mechanicId, setMechanicId] = useState<string>('');

  const mechanics = trpc.mechanics.list.useQuery();
  const bookings = trpc.bookings.list.useQuery({
    search: search.trim() || undefined,
    status: (status || undefined) as never,
    mechanicId: (mechanicId || undefined) as never,
    limit: 100,
  });

  const rows = bookings.data ?? [];
  const mechName = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of mechanics.data ?? []) m.set(x.id, x.name);
    return m;
  }, [mechanics.data]);

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-8 py-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-semibold text-fg text-xl tracking-tight">Bookinger</h1>
          <p className="text-fg-muted text-sm">Alle bookinger for verkstedet ditt</p>
        </div>
        <Link
          href={'/bookinger/ny' as Route}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-primary px-4 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90"
        >
          <Plus size={15} />
          Ny booking
        </Link>
      </div>

      {/* Filterrad */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search
            size={15}
            className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 text-fg-faint"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk kunde, regnr eller notat …"
            className="h-9 w-full rounded-md border border-border bg-bg pr-3 pl-9 text-fg text-sm placeholder:text-fg-faint focus-visible:outline-2 focus-visible:outline-accent"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-md border border-border bg-bg px-3 text-fg text-sm focus-visible:outline-2 focus-visible:outline-accent"
        >
          <option value="">Alle statuser</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select
          value={mechanicId}
          onChange={(e) => setMechanicId(e.target.value)}
          className="h-9 rounded-md border border-border bg-bg px-3 text-fg text-sm focus-visible:outline-2 focus-visible:outline-accent"
        >
          <option value="">Alle mekanikere</option>
          {(mechanics.data ?? []).map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {/* Liste / tilstander */}
      {bookings.isLoading ? (
        <div className="py-16 text-center text-fg-faint text-sm">Laster bookinger …</div>
      ) : bookings.isError ? (
        <CardShell className="p-6">
          <p className="text-danger text-sm">
            Kunne ikke hente bookinger: {bookings.error.message}
          </p>
        </CardShell>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <CalendarCheck size={26} className="text-fg-faint" />
          <p className="text-fg-muted text-sm">Ingen bookinger matcher filteret.</p>
          <Link href={'/bookinger/ny' as Route} className="text-primary text-sm hover:underline">
            Opprett den første →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {rows.map((b) => (
            <Link key={b.id} href={`/bookinger/${b.id}` as Route} className="group">
              <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 transition-colors group-hover:border-border-strong group-hover:bg-surface-2">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-[13px] text-fg">
                      {b.regNumber ?? 'Uten regnr'}
                    </span>
                    <span className="truncate text-fg-faint text-xs">
                      {b.customerName ?? 'Ukjent kunde'}
                    </span>
                    {b.source === 'quick' && (
                      <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-fg-faint uppercase">
                        Quick
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-fg-muted text-xs">
                    <span className="truncate">{b.serviceName ?? 'Tjeneste'}</span>
                    <span className="text-fg-faint">·</span>
                    <Wrench size={11} className="shrink-0 text-fg-faint" />
                    <span className="truncate">{mechName.get(b.mechanicId) ?? b.mechanicName}</span>
                  </div>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-[13px] text-fg tabular-nums">{fmtDateTime(b.startsAt)}</p>
                  <p className="text-fg-faint text-xs">{fmtMinor(b.priceMinor)}</p>
                </div>
                <span
                  className={`shrink-0 rounded-md px-2 py-1 font-medium text-[11px] ${STATUS_TONE[b.status] ?? 'bg-surface-2 text-fg-muted'}`}
                >
                  {STATUS_LABEL[b.status] ?? b.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
