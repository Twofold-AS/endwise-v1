'use client';

import { Avatar, Car, ChevronRight, Mail, Phone, Search, Users } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Feil, Kilde, Laster, Tomt } from './_delt';
import { NyKunde } from './_ny-kunde';

/**
 * F5-02 — KUNDER. Liste med søk og filtrering.
 *
 * ⚠️ **Filtreringen bor HER, ikke i Settings** (prinsippet fra F5-19:
 * konfigurasjon i Settings, filtrering der arbeidet skjer). Søket treffer navn,
 * e-post og telefon — de tre tingene man har for hånden når kunden ringer.
 *
 * Sorteringen er en allowlist server-side (A03); knappene her er bare de samme
 * to verdiene serveren allerede godtar.
 */
const SORTERINGER = [
  { key: 'navn', label: 'Navn' },
  { key: 'opprettet', label: 'Nyeste' },
] as const;

const KILDER = [
  { key: 'alle', label: 'Alle' },
  { key: 'endwise', label: 'Endwise' },
  { key: 'quick', label: 'Quick' },
] as const;

function KunderInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [sok, setSok] = useState(params?.get('sok') ?? '');
  /**
   * ⚠️ Quick action «Ny kunde» peker hit med ?ny=1. Fram til 09.08.2026 leste
   * ingenting den parameteren — knappen gikk til en side som så uendret ut.
   * Samme feil som /innboks?ny=1 hadde. Se `_ny-kunde.tsx`.
   */
  const nyKunde = params?.get('ny') === '1';
  const [sorter, setSorter] = useState<'navn' | 'opprettet'>('navn');
  const [kilde, setKilde] = useState<'alle' | 'endwise' | 'quick'>('alle');

  const kunder = trpc.customers.list.useQuery({
    sok: sok.trim() || undefined,
    sorter,
    retning: sorter === 'opprettet' ? 'desc' : 'asc',
    kilde,
    limit: 200,
  });

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="sr-only">Kunder</h1>
        <p className="text-title text-fg">Kunder</p>
        <p className="text-body text-fg-muted">
          Søk opp en kunde for å se kjøretøy, historikk og meldinger samlet.
        </p>
      </div>

      {nyKunde && <NyKunde onLukk={() => router.replace('/kunder' as Route)} />}

      {/* Søk + filtre */}
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
            placeholder="Søk på navn, e-post eller telefon"
            aria-label="Søk i kunder"
            className="h-control w-full rounded-control border border-border bg-bg pr-3 pl-8 text-body text-fg outline-none placeholder:text-fg-muted/60 focus-visible:border-fg"
          />
        </label>

        <Knapperad
          aria-label="Kilde"
          valg={KILDER}
          aktiv={kilde}
          onVelg={(k) => setKilde(k as typeof kilde)}
        />
        <Knapperad
          aria-label="Sortering"
          valg={SORTERINGER}
          aktiv={sorter}
          onVelg={(k) => setSorter(k as typeof sorter)}
        />
      </div>

      {kunder.isLoading ? (
        <Laster />
      ) : kunder.isError ? (
        <Feil melding={kunder.error.message} />
      ) : (kunder.data?.length ?? 0) === 0 ? (
        <Tomt
          tittel={sok ? 'Ingen treff' : 'Ingen kunder ennå'}
          hint={
            sok
              ? 'Prøv et annet søk, eller fjern filteret.'
              : 'Kunder opprettes når en booking kommer inn, eller synkes fra Quick.'
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          {kunder.data?.map((k, i) => (
            <Link key={k.id} href={`/kunder/${k.id}` as Route} className="group block">
              <div
                className={`flex h-row-store items-center gap-4 bg-bg px-4 transition-colors group-hover:bg-surface-2 ${
                  i > 0 ? 'border-border border-t' : ''
                }`}
              >
                {/* Samme seed som kundekortet raden lenker til. */}
                <Avatar seed={k.id} navn="" size={32} bevegelse="stille" />

                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-2 truncate text-label text-fg">
                    {k.name}
                    <Kilde source={k.source} />
                  </span>
                  <span className="flex items-center gap-3 truncate text-[12px] text-fg-muted">
                    {k.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone size={12} strokeWidth={1.75} />
                        {k.phone}
                      </span>
                    )}
                    {k.email && (
                      <span className="inline-flex items-center gap-1 truncate">
                        <Mail size={12} strokeWidth={1.75} />
                        {k.email}
                      </span>
                    )}
                    {!k.phone && !k.email && 'Ingen kontaktinfo'}
                  </span>
                </div>

                {k.antallKjoretoy > 0 && (
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] text-fg-muted tabular-nums">
                    <Car size={14} strokeWidth={1.75} />
                    {k.antallKjoretoy}
                  </span>
                )}
                <ChevronRight size={16} className="shrink-0 text-fg-muted" aria-hidden />
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="flex items-center gap-1.5 text-[12px] text-fg-muted">
        <Users size={14} />
        {kunder.data?.length ?? 0} kunder vist. Filtrene over gjelder kun denne lista.
      </p>
    </div>
  );
}

function Knapperad({
  valg,
  aktiv,
  onVelg,
  'aria-label': label,
}: {
  valg: readonly { key: string; label: string }[];
  aktiv: string;
  onVelg: (key: string) => void;
  'aria-label': string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex h-control items-center gap-0.5 rounded-control border border-border bg-bg p-0.5"
    >
      {valg.map((v) => (
        <button
          key={v.key}
          type="button"
          role="tab"
          aria-selected={aktiv === v.key}
          onClick={() => onVelg(v.key)}
          className={`inline-flex h-7 items-center rounded-[7px] px-2.5 text-label transition-colors ${
            aktiv === v.key ? 'bg-sidebar-active text-fg' : 'text-fg-muted hover:text-fg'
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}

/** ⚠️ Suspense-grense er PÅKREVD: siden leser `useSearchParams()` (?sok=). */
export default function Page() {
  return (
    <Suspense fallback={<div className="px-8 py-7 text-body text-fg-muted">Laster kunder …</div>}>
      <KunderInner />
    </Suspense>
  );
}
