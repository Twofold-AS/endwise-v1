'use client';

import { Car, ChevronRight, Search } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { EuFrist, Feil, Laster, Tomt, TYPE_LABEL } from '../kunder/_delt';

/**
 * F5-03 — KJØRETØY. Liste med søk på **regnr og understellsnummer**.
 *
 * Det er de to tingene man har når kjøretøyet står foran deg og eieren ikke gjør
 * det. Søket treffer også merke og modell, fordi «den svarte Yamahaen» er et
 * like vanlig utgangspunkt.
 *
 * Eiernavnet står i lista med vilje: en ren regnr-liste er bare kodetall.
 */
const TYPER = [
  { key: 'alle', label: 'Alle' },
  { key: 'mc', label: 'MC' },
  { key: 'boat', label: 'Båt' },
  { key: 'atv', label: 'ATV' },
] as const;

function KjoretoyInner() {
  const params = useSearchParams();
  const [sok, setSok] = useState(params?.get('sok') ?? '');
  const [type, setType] = useState<'alle' | 'mc' | 'boat' | 'atv'>('alle');

  const kjoretoy = trpc.vehicles.list.useQuery({
    sok: sok.trim() || undefined,
    type,
    limit: 200,
  });

  return (
    <div className="mx-auto flex w-full max-w-[1050px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="sr-only">Kjøretøy</h1>
        <p className="text-title text-fg">Kjøretøy</p>
        <p className="text-body text-fg-muted">
          Søk på registreringsnummer, understellsnummer, merke eller modell.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex h-control min-w-[260px] flex-1 items-center">
          <Search
            size={15}
            strokeWidth={1.75}
            className="pointer-events-none absolute left-2.5 text-fg-muted"
            aria-hidden
          />
          <input
            value={sok}
            onChange={(e) => setSok(e.target.value)}
            placeholder="AB12345, understellsnr, Yamaha …"
            aria-label="Søk i kjøretøy"
            className="h-control w-full rounded-control border border-border bg-bg pr-3 pl-8 text-body text-fg outline-none placeholder:text-fg-muted/60 focus-visible:border-fg"
          />
        </label>

        <div
          role="tablist"
          aria-label="Kjøretøytype"
          className="inline-flex h-control items-center gap-0.5 rounded-control border border-border bg-bg p-0.5"
        >
          {TYPER.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={type === t.key}
              onClick={() => setType(t.key)}
              className={`inline-flex h-7 items-center rounded-[7px] px-2.5 text-label transition-colors ${
                type === t.key ? 'bg-sidebar-active text-fg' : 'text-fg-muted hover:text-fg'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {kjoretoy.isLoading ? (
        <Laster />
      ) : kjoretoy.isError ? (
        <Feil melding={kjoretoy.error.message} />
      ) : (kjoretoy.data?.length ?? 0) === 0 ? (
        <>
          <Tomt
            tittel={sok ? 'Ingen treff' : 'Ingen kjøretøy ennå'}
            hint={
              sok
                ? 'Prøv et annet søk, eller bytt type.'
                : 'Kjøretøy registreres når du oppretter en jobb, eller slås opp mot Vegvesenet.'
            }
          />
          {!sok && (
            <div className="-mt-2 flex justify-center">
              <Link
                href={'/bookinger/ny' as Route}
                className="inline-flex h-control items-center gap-1.5 rounded-control border border-border px-2.5 text-label text-fg transition-colors hover:bg-surface-2"
              >
                Slå opp regnr
              </Link>
            </div>
          )}
        </>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="flex h-9 items-center gap-4 border-border border-b bg-surface-2 px-4 text-[12px] text-fg-muted">
            <span className="w-24 shrink-0">Regnr</span>
            <span className="min-w-0 flex-1">Kjøretøy</span>
            <span className="w-16 shrink-0">Type</span>
            <span className="w-40 shrink-0">Eier</span>
            <span className="w-32 shrink-0 text-right">EU-frist</span>
            <span className="w-4 shrink-0" />
          </div>

          {kjoretoy.data?.map((v, i) => (
            <Link key={v.id} href={`/kjoretoy/${v.id}` as Route} className="group block">
              <div
                className={`flex h-row-store items-center gap-4 bg-bg px-4 transition-colors group-hover:bg-surface-2 ${
                  i > 0 ? 'border-border border-t' : ''
                }`}
              >
                <span className="w-24 shrink-0 truncate font-mono text-label text-fg">
                  {v.regNumber ?? 'Uten regnr'}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-label text-fg">
                    {[v.make, v.model].filter(Boolean).join(' ') || 'Ukjent modell'}
                  </span>
                  {v.modelYear && <span className="text-[12px] text-fg-muted">{v.modelYear}</span>}
                </div>
                <span className="w-16 shrink-0 text-[12px] text-fg-muted">
                  {TYPE_LABEL[v.type]}
                </span>
                <span className="w-40 shrink-0 truncate text-[12px] text-fg-muted">
                  {v.customerName ?? 'Ingen eier'}
                </span>
                <span className="w-32 shrink-0 text-right text-[12px] tabular-nums">
                  <EuFrist dato={v.inspectionDue} />
                </span>
                <ChevronRight size={16} className="shrink-0 text-fg-muted" aria-hidden />
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="flex items-center gap-1.5 text-[12px] text-fg-muted">
        <Car size={14} />
        {kjoretoy.isLoading
          ? 'Laster kjøretøy …'
          : `${kjoretoy.data?.length ?? 0} kjøretøy vist. Merke, modell og EU-frist er speilet fra Vegvesenet — ikke redigert av oss.`}
      </p>
    </div>
  );
}

/** ⚠️ Suspense-grense er PÅKREVD: siden leser `useSearchParams()` (?sok=). */
export default function Page() {
  return (
    <Suspense fallback={<div className="px-8 py-7 text-body text-fg-muted">Laster kjøretøy …</div>}>
      <KjoretoyInner />
    </Suspense>
  );
}
