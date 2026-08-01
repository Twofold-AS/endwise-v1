'use client';

import { Sparkline, TrendingDown, TrendingUp } from '@endwise/ui';
import { CardMedia, CardShell } from '../../_shell/cards';
import type { Kpi } from '../_data';

/**
 * KPI-kort i TheFolds kortstil: dither-visualiseringen ØVERST i et indre panel
 * (dobbel kant via CardShell+CardMedia), tall/etikett i EGEN tekstdel UNDER —
 * ikke tekst oppå canvas. (UI-PAKKER: dither bærer aldri info alene — tallet
 * står i klartekst uansett.)
 */
export function KpiCard({ kpi }: { kpi: Kpi }) {
  const TrendIcon = kpi.trend === 'up' ? TrendingUp : TrendingDown;
  const trendColor = kpi.trend === 'up' ? 'text-success' : 'text-warn';

  return (
    <CardShell>
      {/* Innhold: dither-graf i indre panel (øverst). */}
      <CardMedia className="h-20">
        <Sparkline data={kpi.spark} color={kpi.color} variant="gradient" bloom="aura" animate />
      </CardMedia>

      {/* Tekstdel (under). */}
      <div className="flex flex-col gap-0.5 px-1.5 pt-2 pb-1">
        <p className="font-medium text-fg-muted text-xs">{kpi.label}</p>
        <div className="flex items-end justify-between gap-2">
          <p className="font-semibold text-2xl text-fg tabular-nums tracking-tight">{kpi.value}</p>
          <p className={`inline-flex items-center gap-1 pb-1 font-medium text-xs ${trendColor}`}>
            <TrendIcon size={13} aria-hidden />
            {kpi.delta}
          </p>
        </div>
      </div>
    </CardShell>
  );
}
