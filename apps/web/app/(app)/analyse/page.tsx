'use client';

import {
  ChartColumn,
  ChartLine,
  DitherDonutChart,
  DitherGrowthChart,
  DitherStackedChart,
  Globe,
  RevenueLineChart,
  Users,
} from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { LiveVisitorsGlobe } from '../marked/live/_globe';
import {
  beleggFor,
  KILDE,
  KILDER,
  KILDER_TOTALT,
  nokkeltallFor,
  PERIODER,
  type Periode,
  trafikkFor,
  volumFor,
} from './_data';
import { AnalyseKort } from './_kort';

/**
 * Analyse / Rapporter. Forhandlerens egne tall: drift og nettside.
 * Chart-motor: Amicro dither charts (canvas), Attio-seriehex.
 * Alle tall er mock — se `_data.ts` og «Mock»-merket på hvert kort.
 */
const INK = '#1c1d1f';
const ACTION = '#407ff2';
const FOCUS = '#94b9ff';
const OVERCAST = '#8f99a8';
const SLATE = '#d3d8df';

const VOLUM_BANDS = [
  { key: 'fullfort', label: 'Fullførte', color: ACTION },
  { key: 'avlyst', label: 'Avlyste', color: OVERCAST },
] as const;

const DONUT_FARGER = [ACTION, INK, FOCUS, OVERCAST, SLATE];

function AnalysePageInner() {
  const params = useSearchParams();
  const visning = params?.get('visning') === 'direkte' ? 'direkte' : 'rapporter';
  const [periode, setPeriode] = useState<Periode>('30d');
  const bookings = trpc.bookings.list.useQuery({ limit: 1 });

  const nokkeltall = nokkeltallFor(periode);
  const volum = volumFor(periode);
  const belegg = beleggFor(periode);
  const trafikk = trafikkFor(periode);
  const tomt = bookings.isSuccess && (bookings.data?.length ?? 0) === 0;

  const volumRader = useMemo(
    () => volum.map((d) => ({ label: d.dag, fullfort: d.fullfort, avlyst: d.avlyst })),
    [volum],
  );
  const kilderSlices = useMemo(
    () =>
      KILDER.map((k, i) => ({
        name: k.kilde,
        value: k.besok,
        color: DONUT_FARGER[i] ?? OVERCAST,
      })),
    [],
  );

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-8 py-7">
      <h1 className="sr-only">Rapporter</h1>

      {visning === 'rapporter' && tomt && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-8 py-16 text-center">
          <p className="text-label text-fg">Ingen rapporter ennå</p>
          <p className="max-w-md text-body text-fg-muted">
            Tallene kommer når verkstedet har ekte jobber. Vi viser ikke oppdiktede butikktall.
          </p>
          <Link
            href={'/bookinger/ny' as Route}
            className="inline-flex h-control items-center rounded-control bg-fg px-4 text-label text-bg"
          >
            Ny jobb
          </Link>
        </div>
      )}

      {visning === 'rapporter' && bookings.isLoading && (
        <div className="h-40 animate-pulse rounded-xl bg-surface-2" />
      )}

      {visning === 'rapporter' && !tomt && !bookings.isLoading && (
        <div className="flex justify-end">
          <Velger
            aria-label="Periode"
            valg={PERIODER.map((p) => ({ key: p.key, label: p.label }))}
            aktiv={periode}
            onVelg={(p) => setPeriode(p as Periode)}
          />
        </div>
      )}

      {visning === 'direkte' ? (
        <AnalyseKort
          id="besokende"
          icon={Globe}
          tittel="Live besøkende"
          forklaring={KILDE.besokende.forklaring}
        >
          <div className="h-[420px] overflow-hidden rounded-lg border border-border">
            <LiveVisitorsGlobe />
          </div>
        </AnalyseKort>
      ) : tomt || bookings.isLoading ? null : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {nokkeltall.map((k) => (
              <AnalyseKort
                key={k.key}
                id="bookingvolum"
                icon={ChartLine}
                tittel={k.label}
                forklaring={k.forklaring}
                verdi={k.verdi}
                delta={k.delta}
                opp={k.opp}
              />
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <AnalyseKort
              id="bookingvolum"
              icon={ChartColumn}
              tittel="Bookingvolum"
              forklaring={KILDE.bookingvolum.forklaring}
            >
              <div className="h-52 w-full">
                <DitherStackedChart theme="light" compact rows={volumRader} bands={[...VOLUM_BANDS]} />
              </div>
              <SerieMerke
                poster={[
                  { label: 'Fullførte', color: ACTION },
                  { label: 'Avlyste', color: OVERCAST },
                ]}
              />
            </AnalyseKort>

            <AnalyseKort
              id="belegg"
              icon={ChartLine}
              tittel="Belegg og avlysningsrate"
              forklaring={KILDE.belegg.forklaring}
            >
              <div className="h-52 w-full">
                <RevenueLineChart
                  theme="light"
                  compact
                  series={[
                    {
                      key: 'belegg',
                      label: 'Belegg',
                      color: ACTION,
                      data: belegg.map((b) => b.belegg),
                      fill: true,
                    },
                    {
                      key: 'avlysning',
                      label: 'Avlysningsrate',
                      color: INK,
                      data: belegg.map((b) => b.avlysning),
                      fill: false,
                    },
                  ]}
                />
              </div>
              <SerieMerke
                poster={[
                  { label: 'Belegg', color: ACTION },
                  { label: 'Avlysningsrate', color: INK },
                ]}
              />
            </AnalyseKort>

            <AnalyseKort
              id="sidevisninger"
              icon={ChartLine}
              tittel="Sidevisninger"
              forklaring={KILDE.sidevisninger.forklaring}
            >
              <div className="h-52 w-full">
                <DitherGrowthChart
                  theme="light"
                  compact
                  values={trafikk.map((t) => t.visninger)}
                  labels={trafikk.map((t) => t.dag)}
                  color={ACTION}
                />
              </div>
              <SerieMerke poster={[{ label: 'Sidevisninger', color: ACTION }]} />
            </AnalyseKort>

            <AnalyseKort
              id="kilder"
              icon={Users}
              tittel="Hvor besøkende kommer fra"
              forklaring={KILDE.kilder.forklaring}
            >
              <div className="flex items-center gap-4">
                <div className="aspect-square h-40 w-40 shrink-0">
                  <DitherDonutChart theme="light" compact slices={kilderSlices} />
                </div>
                <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
                  {KILDER.map((k, i) => (
                    <li key={k.kilde} className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="size-2 shrink-0 rounded-[2px]"
                        style={{ background: DONUT_FARGER[i] }}
                      />
                      <span className="min-w-0 flex-1 truncate text-[12px] text-fg-muted">
                        {k.kilde}
                      </span>
                      <span className="shrink-0 text-label text-fg tabular-nums">
                        {Math.round((k.besok / KILDER_TOTALT) * 100)} %
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </AnalyseKort>
          </div>

          <p className="text-[12px] text-fg-muted leading-relaxed">
            Eksempel — ikke live verkstedstall. Grafene viser hvordan rapportene vil se ut når
            bookinger er koblet.
          </p>
        </>
      )}
    </div>
  );
}

function SerieMerke({ poster }: { poster: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-3 px-1">
      {poster.map((p) => (
        <span key={p.label} className="inline-flex items-center gap-1.5 text-[12px] text-fg-muted">
          <span className="size-2 rounded-[2px]" style={{ background: p.color }} aria-hidden />
          {p.label}
        </span>
      ))}
    </div>
  );
}

function Velger({
  valg,
  aktiv,
  onVelg,
  'aria-label': label,
}: {
  valg: { key: string; label: string; icon?: typeof ChartColumn }[];
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
          className={`inline-flex h-7 items-center gap-1.5 rounded-[7px] px-2.5 text-label transition-colors ${
            aktiv === v.key ? 'bg-sidebar-active text-fg' : 'text-fg-muted hover:text-fg'
          }`}
        >
          {v.icon && <v.icon size={16} />}
          {v.label}
        </button>
      ))}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="px-8 py-7 text-body text-fg-muted">Laster analyse …</div>}>
      <AnalysePageInner />
    </Suspense>
  );
}
