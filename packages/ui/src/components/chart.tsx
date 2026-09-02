'use client';

import { cn } from '@endwise/ui/lib/utils';
import type * as React from 'react';
import { useId } from 'react';
import { Legend, ResponsiveContainer, Tooltip } from 'recharts';

/*
 * shadcn/ui Chart-mønsteret på Recharts. etter
 * brukergodkjent §2-beslutning (Recharts er chart-motoren; dither-kit ble
 * fjernet 03.08 og lot flaten stå uten motor).
 * Ligger i `packages/ui`, ikke i appen — samme regel som dropdown-menu og
 * dialog: apper importerer ikke chart-biblioteket direkte (ui-pakker §5). Da
 * finnes akse-stil, tooltip og farge-oppslag ett sted.
 * Hvorfor `ChartStyle` finnes
 * Recharts tar farger som props (`fill`, `stroke`), ikke som klasser. Uten et
 * mellomledd ville hver graf hardkodet en hex — og da snur den ikke med
 * lys/mørk-toggelen. `ChartStyle` skriver ut `--color-<serie>` per graf, hentet
 * fra `config`, slik at seriene kan si `fill="var(--color-bookinger)"` og
 * verdien løses mot token-laget i det gjeldende temaet.
 * Bevisst enkelt
 * Målgruppen er en ikke-teknisk forhandler. Derfor: kun søyle, linje og areal.
 * Ingen glød, ingen 3D, ingen crosshatch, og `isAnimationActive={false}` som
 * standard i kallstedene — en graf som beveger seg mens du leser den, er
 * vanskeligere å lese.
 */

export type ChartConfig = Record<
  string,
  {
    label: string;
    /** CSS-farge. Bruk en token-variabel, ikke en hex. */
    color: string;
  }
>;

/** Fargene grafene skal bruke. Peker inn i token-laget, aldri hardkodet hex. */
export const CHART_COLORS = {
  accent: 'var(--ew-accent-strong)',
  blue: 'var(--ew-switch-track-on)',
  warn: 'var(--ew-warn)',
  danger: 'var(--ew-danger)',
  muted: 'var(--ew-fg-muted)',
} as const;

function useChartId(): string {
  // `useId` og ikke en teller eller Math.random: SSR og klient må komme fram
  // til samme id, ellers får vi hydreringsfeil og feil farger i første frame.
  // Kolon er ugyldig i en CSS-attributtselektor, derfor byttes det ut.
  return `ew-chart-${useId().replace(/:/g, '')}`;
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const vars = Object.entries(config)
    .map(([key, v]) => `  --color-${key}: ${v.color};`)
    .join('\n');
  if (!vars) return null;
  return (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: kun våre egne token-navn fra `config`, ingen brukerinput
    <style dangerouslySetInnerHTML={{ __html: `[data-chart="${id}"] {\n${vars}\n}` }} />
  );
}

/**
 * Rammen rundt enhver graf. Setter høyde, farge-variabler og de felles
 * Recharts-overstyringene (akselinjer, grid, fokusring) som ellers måtte
 * gjentas i hver eneste graf.
 */
export function ChartContainer({
  config,
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof ResponsiveContainer>['children'];
}) {
  const id = useChartId();
  return (
    <div
      data-chart={id}
      data-slot="chart"
      className={cn(
        'flex aspect-video justify-center text-[12px]',
        // Akser, grid og legend styres her — ikke med props på hver graf.
        '[&_.recharts-cartesian-axis-tick_text]:fill-[var(--ew-fg-muted)]',
        '[&_.recharts-cartesian-grid_line]:stroke-[var(--ew-border)]',
        '[&_.recharts-cartesian-axis-line]:stroke-[var(--ew-border)]',
        '[&_.recharts-cartesian-axis-tick-line]:stroke-[var(--ew-border)]',
        '[&_.recharts-curve.recharts-tooltip-cursor]:stroke-[var(--ew-border-strong)]',
        '[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-[var(--ew-surface-2)]',
        '[&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none',
        className,
      )}
      {...props}
    >
      <ChartStyle id={id} config={config} />
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

/** Recharts' Tooltip, men med vår ramme. Bruk sammen med `ChartTooltipContent`. */
export const ChartTooltip = Tooltip;
export const ChartLegend = Legend;

type TooltipEntry = {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
};

/**
 * Tooltip-innholdet. Leser etiketten fra `config`, ikke fra dataKey — da står
 * det «Fullførte saker» og ikke «fullfort» foran forhandleren.
 */
export function ChartTooltipContent({
  active,
  payload,
  label,
  config,
  valueSuffix = '',
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  config: ChartConfig;
  /** F.eks. « besøk» eller « %». */
  valueSuffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[160px] rounded-control border border-border bg-bg px-3 py-2">
      {label != null && <p className="mb-1.5 text-[12px] text-fg-muted">{label}</p>}
      <div className="flex flex-col gap-1">
        {payload.map((entry) => {
          const key = String(entry.dataKey ?? entry.name ?? '');
          const meta = config[key];
          return (
            <div key={key} className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-[2px]"
                style={{ background: meta?.color ?? entry.color ?? CHART_COLORS.muted }}
              />
              <span className="flex-1 text-[12px] text-fg-muted">{meta?.label ?? key}</span>
              <span className="text-label text-fg tabular-nums">
                {typeof entry.value === 'number'
                  ? entry.value.toLocaleString('nb-NO')
                  : entry.value}
                {valueSuffix}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Legend-innhold i vår typografi. Recharts' standard bruker inline-stiler. */
export function ChartLegendContent({ config }: { config: ChartConfig }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-2">
      {Object.entries(config).map(([key, v]) => (
        <span key={key} className="flex items-center gap-1.5 text-[12px] text-fg-muted">
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-[2px]"
            style={{ background: v.color }}
          />
          {v.label}
        </span>
      ))}
    </div>
  );
}

/*
 * Recharts-primitivene re-eksporteres herfra slik at appene aldri importerer
 * `recharts` direkte (ui-pakker §5, samme regel som for radix og lucide).
 * Bytter vi motor senere, er det denne fila som endres — ikke tjue kallsteder.
 * Kun de rene graftypene er eksponert: søyle, linje, areal — og **pai**
 * (lagt til på eiers bestilling, til fordelingen av trafikkilder).
 * Radar, scatter, treemap og sankey er fortsatt utelatt: de er ikke bestilt, og
 * en eksportert komponent er en komponent noen tar i bruk.
 */
export {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
