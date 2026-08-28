'use client';

import { ArrowLeftRight, ChevronDown, Package, Search } from '@endwise/ui';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useOrgRole } from '../../_lib/use-org-role';
import { LagerPiller } from '../../_shell/ansatte-piller';
import { Beholdning, Feil, kroner, Laster, Sidehode, Tomt } from '../_delt';
import { BevegelseDialog } from './_bevegelse-dialog';

/**
 * Lager · Deler.
 * Sorteringen er en allowlist, ikke en fri streng. Verdiene under er de
 * eneste serveren godtar (`PART_SORT` i `inventory.ts`). Det er ikke
 * dobbeltarbeid — det er at klienten og serveren er enige om det samme lille
 * settet, og at serveren ikke stoler på klienten uansett (A03).
 * Kostpris vises kun for admin. Den er en forretningshemmelighet, og
 * AI-agenten ser den heller ikke (LLM06).
 */
const SORTERINGER = [
  { key: 'sku', label: 'Delenummer' },
  { key: 'navn', label: 'Navn' },
  { key: 'kategori', label: 'Kategori' },
  { key: 'opprettet', label: 'Nyeste' },
] as const;

type Sortering = (typeof SORTERINGER)[number]['key'];

function DelerInner() {
  const params = useSearchParams();
  const { isAdmin } = useOrgRole();

  const [sok, setSok] = useState(params?.get('sok') ?? '');
  const [sorter, setSorter] = useState<Sortering>('sku');
  const [retning, setRetning] = useState<'asc' | 'desc'>('asc');
  const [valgtDel, setValgtDel] = useState<{ id: string; sku: string; name: string } | null>(null);

  const deler = trpc.inventory.listParts.useQuery({
    sok: sok.trim() || undefined,
    sorter,
    retning,
    kunLav: false,
    limit: 200,
  });

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5 px-8 py-7">
      <Sidehode
        tittel="Deler"
        undertittel="Tilgjengelig = på lager minus reservert. Det er tallet som gjelder."
      />
      <LagerPiller />

      {/* Søk + sortering */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex h-control min-w-[240px] flex-1 items-center">
          <Search
            size={15}
            strokeWidth={1.75}
            className="pointer-events-none absolute left-2.5 text-fg-muted"
            aria-hidden
          />
          <input
            value={sok}
            onChange={(e) => setSok(e.target.value)}
            placeholder="Søk på delenummer, navn eller kategori"
            aria-label="Søk i deler"
            className="h-control w-full rounded-control border border-border bg-bg pr-3 pl-8 text-body text-fg outline-none placeholder:text-fg-muted/60 focus-visible:border-fg"
          />
        </label>

        <div
          role="tablist"
          aria-label="Sortering"
          className="inline-flex h-control items-center gap-0.5 rounded-control border border-border bg-bg p-0.5"
        >
          {SORTERINGER.map((s) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={sorter === s.key}
              onClick={() => setSorter(s.key)}
              className={`inline-flex h-7 items-center rounded-[7px] px-2.5 text-label transition-colors ${
                sorter === s.key ? 'bg-sidebar-active text-fg' : 'text-fg-muted hover:text-fg'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setRetning((r) => (r === 'asc' ? 'desc' : 'asc'))}
          title={retning === 'asc' ? 'Stigende' : 'Synkende'}
          className="flex h-control items-center gap-1.5 rounded-control border border-border px-2.5 text-label text-fg transition-colors hover:bg-surface-2"
        >
          <ChevronDown
            size={14}
            strokeWidth={1.75}
            className={`text-fg-muted transition-transform ${retning === 'desc' ? '' : 'rotate-180'}`}
            aria-hidden
          />
          {retning === 'asc' ? 'Stigende' : 'Synkende'}
        </button>
      </div>

      {deler.isLoading ? (
        <Laster />
      ) : deler.isError ? (
        <Feil melding={deler.error.message} />
      ) : (deler.data?.length ?? 0) === 0 ? (
        <Tomt
          tittel={sok ? 'Ingen treff' : 'Ingen deler ennå'}
          hint={sok ? 'Prøv et annet søk.' : 'Deler legges inn av forhandler-admin.'}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          {/* Kolonnehode */}
          <div className="flex h-9 items-center gap-4 border-border border-b bg-surface-2 px-4 text-[12px] text-fg-muted">
            <span className="w-28 shrink-0">Delenummer</span>
            <span className="min-w-0 flex-1">Navn</span>
            <span className="w-28 shrink-0">Kategori</span>
            {isAdmin && <span className="w-24 shrink-0 text-right">Kostpris</span>}
            <span className="w-24 shrink-0 text-right">Tilgjengelig</span>
            <span className="w-8 shrink-0" />
          </div>

          {deler.data?.map((d, i) => (
            <div
              key={d.id}
              className={`flex h-row-store items-center gap-4 bg-bg px-4 ${
                i > 0 ? 'border-border border-t' : ''
              }`}
            >
              <span className="w-28 shrink-0 truncate font-mono text-[12px] text-fg-muted">
                {d.sku}
              </span>
              <span className="min-w-0 flex-1 truncate text-label text-fg">{d.name}</span>
              <span className="w-28 shrink-0 truncate text-[12px] text-fg-muted">
                {d.category ?? '—'}
              </span>
              {/* Kostpris: kun admin. Forretningshemmelighet. */}
              {isAdmin && (
                <span className="w-24 shrink-0 text-right text-[12px] text-fg-muted tabular-nums">
                  {kroner(d.costMinor)}
                </span>
              )}
              <span className="flex w-24 shrink-0 justify-end">
                <Beholdning
                  tilgjengelig={d.tilgjengelig}
                  reservert={d.reserved}
                  lav={d.underMinimum}
                />
              </span>
              <button
                type="button"
                onClick={() => setValgtDel({ id: d.id, sku: d.sku, name: d.name })}
                title="Registrer bevegelse"
                aria-label={`Registrer bevegelse for ${d.name}`}
                className="grid size-8 shrink-0 place-items-center rounded-control text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <ArrowLeftRight size={16} strokeWidth={1.75} />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="flex items-center gap-1.5 text-[12px] text-fg-muted">
        <Package size={14} />
        Lager er drift, ikke handel. Utsalgspriser og ordrer hører hjemme i Butikk.
      </p>

      {valgtDel && (
        <BevegelseDialog
          del={valgtDel}
          onLukk={() => setValgtDel(null)}
          onFerdig={() => {
            setValgtDel(null);
            void deler.refetch();
          }}
        />
      )}
    </div>
  );
}

/** Suspense-grense er PÅKREVD: siden leser `useSearchParams()` (?sok=). */
export default function Page() {
  return (
    <Suspense fallback={<div className="px-8 py-7 text-body text-fg-muted">Laster deler …</div>}>
      <DelerInner />
    </Suspense>
  );
}
