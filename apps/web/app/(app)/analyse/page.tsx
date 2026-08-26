'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  CHART_COLORS,
  ChartColumn,
  type ChartConfig,
  ChartContainer,
  ChartLegendContent,
  ChartLine,
  ChartTooltip,
  ChartTooltipContent,
  Globe,
  Line,
  LineChart,
  Pie,
  PieChart,
  Users,
  XAxis,
  YAxis,
} from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
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
 * F5-18 — ANALYSE. Forhandlerens egne tall: drift og nettside.
 *
 * ⚠️ **Ingen h1 med «Analyse».** Breadcrumben i topbaren sier det allerede —
 * to like titler over hverandre er samme informasjon to ganger. Plassen brukes
 * i stedet til periodevelgeren, som faktisk gjør noe.
 *
 * **Chart-motor: Recharts** via shadcns Chart-mønster. Fargene er CSS-variabler
 * mot token-laget, så grafene snur med lys/mørk uten betinget farge her.
 *
 * ⛔ Ingen kunde-PII. Alt er aggregater.
 * ⚠️ Alle tall er mock — se `_data.ts` og «Mock»-merket på hvert kort.
 */
const CFG_VOLUM: ChartConfig = {
  fullfort: { label: 'Fullførte', color: CHART_COLORS.accent },
  avlyst: { label: 'Avlyste', color: CHART_COLORS.muted },
};
const CFG_BELEGG: ChartConfig = {
  belegg: { label: 'Belegg', color: CHART_COLORS.accent },
  avlysning: { label: 'Avlysningsrate', color: CHART_COLORS.warn },
};
const CFG_TRAFIKK: ChartConfig = {
  visninger: { label: 'Sidevisninger', color: CHART_COLORS.blue },
  bookingstart: { label: 'Startet booking', color: CHART_COLORS.accent },
};

/** Paiskivenes farger. Fem skiver, fem toner — ingen gjentakelse. */
const PAI_FARGER = [
  CHART_COLORS.accent,
  CHART_COLORS.blue,
  CHART_COLORS.warn,
  CHART_COLORS.danger,
  CHART_COLORS.muted,
];
const CFG_KILDER: ChartConfig = Object.fromEntries(
  KILDER.map((k, i) => [k.kilde, { label: k.kilde, color: PAI_FARGER[i] }]),
);

const AKSE = { tickLine: false, axisLine: false, tickMargin: 8 } as const;

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

      {/* ⚠️ Ingen fane-velger for Rapporter/Direkte data (fjernet 06.08.2026).
          Sidebaren eier navigasjonen — en tab-rad som gjør det samme er to
          kontroller for én beslutning, og de går ut av synk.
          Periodevelgeren står: den FILTRERER, den navigerer ikke. */}
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
          {/* Nøkkeltall — tallet før grafen. */}
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
              <ChartContainer config={CFG_VOLUM} className="aspect-auto h-52 w-full">
                <BarChart data={volum} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="dag" {...AKSE} interval={periode === '30d' ? 6 : 0} />
                  <YAxis {...AKSE} width={40} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent config={CFG_VOLUM} />}
                  />
                  <Bar
                    dataKey="fullfort"
                    fill="var(--color-fullfort)"
                    radius={[3, 3, 0, 0]}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="avlyst"
                    fill="var(--color-avlyst)"
                    radius={[3, 3, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ChartContainer>
              <ChartLegendContent config={CFG_VOLUM} />
            </AnalyseKort>

            <AnalyseKort
              id="belegg"
              icon={ChartLine}
              tittel="Belegg og avlysningsrate"
              forklaring={KILDE.belegg.forklaring}
            >
              <ChartContainer config={CFG_BELEGG} className="aspect-auto h-52 w-full">
                <LineChart data={belegg} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="uke" {...AKSE} />
                  <YAxis {...AKSE} width={40} domain={[0, 100]} />
                  <ChartTooltip
                    content={<ChartTooltipContent config={CFG_BELEGG} valueSuffix=" %" />}
                  />
                  <Line
                    dataKey="belegg"
                    stroke="var(--color-belegg)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    dataKey="avlysning"
                    stroke="var(--color-avlysning)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ChartContainer>
              <ChartLegendContent config={CFG_BELEGG} />
            </AnalyseKort>

            <AnalyseKort
              id="sidevisninger"
              icon={ChartLine}
              tittel="Sidevisninger"
              forklaring={KILDE.sidevisninger.forklaring}
            >
              <ChartContainer config={CFG_TRAFIKK} className="aspect-auto h-52 w-full">
                <AreaChart data={trafikk} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="dag" {...AKSE} interval={periode === '30d' ? 6 : 0} />
                  <YAxis {...AKSE} width={48} />
                  <ChartTooltip content={<ChartTooltipContent config={CFG_TRAFIKK} />} />
                  <Area
                    dataKey="visninger"
                    stroke="var(--color-visninger)"
                    fill="var(--color-visninger)"
                    fillOpacity={0.12}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                  <Area
                    dataKey="bookingstart"
                    stroke="var(--color-bookingstart)"
                    fill="var(--color-bookingstart)"
                    fillOpacity={0.18}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ChartContainer>
              <ChartLegendContent config={CFG_TRAFIKK} />
            </AnalyseKort>

            {/* Paigraf: fordeling er nettopp det pai er god til — andel av en
                helhet. Tallene står i lista ved siden av, ikke bare i skivene. */}
            <AnalyseKort
              id="kilder"
              icon={Users}
              tittel="Hvor besøkende kommer fra"
              forklaring={KILDE.kilder.forklaring}
            >
              <div className="flex items-center gap-4">
                <ChartContainer config={CFG_KILDER} className="aspect-square h-40 w-40 shrink-0">
                  <PieChart>
                    <ChartTooltip
                      content={<ChartTooltipContent config={CFG_KILDER} valueSuffix=" besøk" />}
                    />
                    <Pie
                      data={KILDER}
                      dataKey="besok"
                      nameKey="kilde"
                      innerRadius={38}
                      outerRadius={70}
                      paddingAngle={2}
                      strokeWidth={0}
                      isAnimationActive={false}
                    >
                      {KILDER.map((k, i) => (
                        <Cell key={k.kilde} fill={PAI_FARGER[i]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>

                <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
                  {KILDER.map((k, i) => (
                    <li key={k.kilde} className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="size-2 shrink-0 rounded-[2px]"
                        style={{ background: PAI_FARGER[i] }}
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

/** Knapperad for et valg. Samme form som visningsbytte i Saker. */
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

/** ⚠️ Suspense-grense er PÅKREVD: siden leser `useSearchParams()`. */
export default function Page() {
  return (
    <Suspense fallback={<div className="px-8 py-7 text-body text-fg-muted">Laster analyse …</div>}>
      <AnalysePageInner />
    </Suspense>
  );
}
