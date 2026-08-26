'use client';

import { CalendarDays, ClipboardList, Funnel, List, Plus, Search, Wrench } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../_shell/cards';
import {
  ALL_STATUSES,
  fmtDateTime,
  fmtMinor,
  fmtServices,
  STATUS_LABEL,
  STATUS_TONE,
} from '../bookinger/_status';
import { Kalender } from './_kalender';

/**
 * Saker. Samler det som var tre nav-punkter: Bookinger, Ny booking og
 * Kalender.
 * Kalenderen er en **visning**, ikke en destinasjon. Tre innganger til samme
 * rom var tre steder å lure på hvor man egentlig skulle. «Ny sak» ligger som
 * quick action i sidebaren — en «opprett»-rad i navigasjonen er en handling
 * forkledd som et sted.
 * Filtrene gjelder begge visningene (prinsippet fra F5-19: konfigurasjon i
 * Settings, filtrering der arbeidet skjer).
 * Detaljruten er fortsatt `/bookinger/[id]` og opprettelse `/bookinger/ny`
 * bevisst ikke flyttet i denne økten. Se sesjonsrapporten.
 */
function SakerPageInner() {
  const router = useRouter();
  const pathname = usePathname() ?? '/saker';
  const params = useSearchParams();
  const visning = params?.get('visning') === 'kalender' ? 'kalender' : 'liste';

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

  function setVisning(next: 'liste' | 'kalender') {
    const q = new URLSearchParams(params?.toString() ?? '');
    if (next === 'kalender') q.set('visning', 'kalender');
    else q.delete('visning');
    router.replace(`${pathname}${q.toString() ? `?${q}` : ''}` as Route);
  }

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-8 py-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-title text-fg">Jobber</h1>
          <p className="text-body text-fg-muted">Bookinger og kalender for verkstedet ditt</p>
        </div>
        <Link
          href={'/bookinger/ny' as Route}
          className="inline-flex h-control shrink-0 items-center gap-2 rounded-control bg-primary px-3.5 text-label text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus size={16} />
          Ny jobb
        </Link>
      </div>

      {/* Visningsbytte — liste kalender. Samme data, to representasjoner. */}
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="tablist"
          aria-label="Visning"
          className="inline-flex h-control items-center gap-0.5 rounded-control border border-border bg-bg p-0.5"
        >
          <ViewTab
            active={visning === 'liste'}
            onClick={() => setVisning('liste')}
            icon={<List size={16} />}
            label="Oversikt"
          />
          <ViewTab
            active={visning === 'kalender'}
            onClick={() => setVisning('kalender')}
            icon={<CalendarDays size={16} />}
            label="Kalender"
          />
        </div>

        <span className="ml-1 inline-flex items-center gap-1.5 text-[12px] text-fg-muted">
          <Funnel size={14} />
          Filtre gjelder begge visninger
        </span>
      </div>

      {/* Filterrad */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search
            size={16}
            className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 text-fg-muted"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk kunde, regnr eller notat …"
            aria-label="Søk i saker"
            className="h-control w-full rounded-control border border-border bg-bg pr-3 pl-9 text-body text-fg placeholder:text-fg-muted focus-visible:outline-2 focus-visible:outline-ring"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filtrer på status"
          className="h-control rounded-control border border-border bg-bg px-3 text-body text-fg focus-visible:outline-2 focus-visible:outline-ring"
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
          aria-label="Filtrer på mekaniker"
          className="h-control rounded-control border border-border bg-bg px-3 text-body text-fg focus-visible:outline-2 focus-visible:outline-ring"
        >
          <option value="">Alle mekanikere</option>
          {(mechanics.data ?? []).map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {visning === 'kalender' ? (
        // . Mekaniker-filteret over gjelder også her
        // (prinsippet i filkommentaren: filtrene gjelder begge visningene).
        // Status- og fritekstfilteret gjør det derimot ikke: en kalender med
        // hull der de filtrerte jobbene sto ville løyet om hvor opptatt dagen er.
        <Kalender mechanicId={mechanicId || undefined} />
      ) : bookings.isLoading ? (
        <div className="py-16 text-center text-body text-fg-muted">Laster saker …</div>
      ) : bookings.isError ? (
        <CardShell className="p-6">
          <p className="text-body text-danger">Kunne ikke hente saker: {bookings.error.message}</p>
        </CardShell>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <ClipboardList size={24} className="text-fg-muted" />
          <p className="text-label text-fg">Ingen jobber ennå</p>
          <p className="text-body text-fg-muted">
            {search || status || mechanicId
              ? 'Ingen jobber matcher filteret.'
              : 'Opprett den første jobben uten å forlate denne flaten.'}
          </p>
          <Link
            href={'/bookinger/ny' as Route}
            className="inline-flex h-control items-center rounded-control bg-fg px-4 text-label text-bg"
          >
            Ny jobb
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          {rows.map((b, i) => (
            <Link key={b.id} href={`/bookinger/${b.id}` as Route} className="group block">
              <div
                className={`flex h-row-store items-center gap-4 bg-bg px-4 transition-colors group-hover:bg-surface-2 ${
                  i > 0 ? 'border-border border-t' : ''
                }`}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-label text-fg">
                      {b.regNumber ?? 'Uten regnr'}
                    </span>
                    <span className="truncate text-[12px] text-fg-muted">
                      {b.customerName ?? 'Ukjent kunde'}
                    </span>
                    {b.source === 'quick' && (
                      <span className="inline-flex h-badge items-center rounded-badge bg-surface-2 px-1.5 text-[11px] text-fg-muted uppercase">
                        Quick
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-fg-muted">
                    <span className="truncate">{fmtServices(b)}</span>
                    <span>·</span>
                    <Wrench size={14} className="shrink-0" />
                    <span className="truncate">{mechName.get(b.mechanicId) ?? b.mechanicName}</span>
                  </div>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-label text-fg tabular-nums">{fmtDateTime(b.startsAt)}</p>
                  <p className="text-[12px] text-fg-muted">{fmtMinor(b.priceMinor)}</p>
                </div>
                <span
                  className={`inline-flex h-badge shrink-0 items-center rounded-badge px-2 font-medium text-[11px] ${STATUS_TONE[b.status] ?? 'bg-surface-2 text-fg-muted'}`}
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

function ViewTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex h-7 items-center gap-1.5 rounded-[7px] px-2.5 text-label transition-colors ${
        active ? 'bg-sidebar-active text-fg' : 'text-fg-muted hover:text-fg'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/**
 * Suspense-grense er påkrevd: siden leser `useSearchParams` (kanal-/
 * visningsvalg fra sidebaren), og uten den faller hele ruten ut av statisk
 * prerender og `next build` feiler.
 */
export default function Page() {
  return (
    <Suspense fallback={<div className="px-8 py-7 text-body text-fg-muted">Laster saker …</div>}>
      <SakerPageInner />
    </Suspense>
  );
}
