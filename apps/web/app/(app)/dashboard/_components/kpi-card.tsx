'use client';

import { TrendingDown, TrendingUp } from '@endwise/ui';
import { CardShell } from '../../_shell/cards';
import type { Kpi } from '../_data';

/**
 * KPI-kort. **Ingen graf** — dither-kit ble fjernet fra UI-et 03.08.2026
 * (eierens beslutning). Kortet står, tallet bærer.
 *
 * Regelen fra før var at grafen aldri skulle bære informasjon alene; tallet
 * skulle alltid stå i klartekst. Derfor kostet det ingenting å ta bort grafen —
 * all informasjon var allerede i teksten. Det er også hele beviset på at regelen
 * var riktig.
 */
export function KpiCard({ kpi }: { kpi: Kpi }) {
  const TrendIcon = kpi.trend === 'up' ? TrendingUp : TrendingDown;
  const trendColor = kpi.trend === 'up' ? 'text-success' : 'text-warn';

  return (
    <CardShell>
      <div className="flex flex-col gap-2 p-3">
        <p className="text-label text-fg-muted">{kpi.label}</p>
        <div className="flex items-end justify-between gap-2">
          <p className="font-medium text-[24px] text-fg leading-none tabular-nums">{kpi.value}</p>
          <p className={`inline-flex items-center gap-1 text-label ${trendColor}`}>
            <TrendIcon size={14} aria-hidden />
            {kpi.delta}
          </p>
        </div>
      </div>
    </CardShell>
  );
}
