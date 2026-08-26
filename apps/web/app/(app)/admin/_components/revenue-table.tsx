'use client';

import { TrendingDown, TrendingUp } from '@endwise/ui';
import { MRR_SERIES } from '../_data';

/**
 * MRR-utvikling, 12 måneder. **Erstatter dither-arealgrafen** (dither-kit ut av
 * UI-et ). Mock til Stripe er koblet (F5-09).
 * Endring per måned var det eneste grafen faktisk fortalte — her står den som
 * tall, med fortegn, i stedet for som en helning man må måle med øyet.
 */
const nok = (v: number) => `${v.toLocaleString('nb-NO')} kr`;

export function RevenueTable() {
  const first = MRR_SERIES[0];
  const last = MRR_SERIES[MRR_SERIES.length - 1];
  const growth = first.mrr > 0 ? Math.round(((last.mrr - first.mrr) / first.mrr) * 100) : 0;
  const GrowthIcon = growth >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-4 rounded-control border border-border bg-inset px-3 py-2">
        <div>
          <p className="text-[12px] text-fg-muted">MRR nå ({last.mnd})</p>
          <p className="font-medium text-[24px] text-fg leading-tight tabular-nums">
            {nok(last.mrr)}
          </p>
        </div>
        <p
          className={`inline-flex items-center gap-1 text-label ${
            growth >= 0 ? 'text-success' : 'text-warn'
          }`}
        >
          <GrowthIcon size={14} aria-hidden />
          {growth >= 0 ? '+' : ''}
          {growth} % siden {first.mnd}
        </p>
      </div>

      <div className="overflow-hidden rounded-control border border-border">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-border border-b">
              <th className="h-row px-3 text-left text-label text-fg-muted">Måned</th>
              <th className="h-row px-3 text-right text-label text-fg-muted">MRR</th>
              <th className="h-row px-3 text-right text-label text-fg-muted">Endring</th>
            </tr>
          </thead>
          <tbody>
            {MRR_SERIES.map((row, i) => {
              const prev = MRR_SERIES[i - 1];
              const delta = prev ? row.mrr - prev.mrr : null;
              return (
                <tr key={row.mnd} className="border-border border-b last:border-b-0">
                  <td className="h-row px-3 text-body text-fg">{row.mnd}</td>
                  <td className="h-row px-3 text-right text-body text-fg tabular-nums">
                    {nok(row.mrr)}
                  </td>
                  <td
                    className={`h-row px-3 text-right text-body tabular-nums ${
                      delta == null ? 'text-fg-muted' : delta >= 0 ? 'text-success' : 'text-warn'
                    }`}
                  >
                    {delta == null ? '—' : `${delta >= 0 ? '+' : ''}${nok(delta)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
