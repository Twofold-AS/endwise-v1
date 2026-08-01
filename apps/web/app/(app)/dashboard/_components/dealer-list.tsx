'use client';

import { ChevronRight, Sparkline } from '@endwise/ui';
import { DEALERS } from '../_data';

/**
 * Forhandlerliste med rad-sparklines. Hver rad har en ekte dither-Sparkline som
 * viser 9-ukers-trenden, men tallene (bookinger, belegg, delta) står alltid i
 * klartekst ved siden av — grafen forsterker, den erstatter ikke.
 */
export function DealerList() {
  return (
    <ul className="divide-y divide-border">
      {DEALERS.map((d) => (
        <li
          key={d.id}
          className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-2"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg">{d.navn}</p>
            <p className="truncate text-xs text-fg-muted">{d.sted}</p>
          </div>

          {/* Rad-sparkline (dekorativ trend). */}
          <div className="hidden h-8 w-24 shrink-0 sm:block">
            <Sparkline
              data={d.spark}
              color={d.trend === 'up' ? 'green' : 'orange'}
              variant="gradient"
            />
          </div>

          {/* Tallene i klartekst. */}
          <div className="w-16 shrink-0 text-right">
            <p className="text-sm font-semibold text-fg tabular-nums">{d.bookinger}</p>
            <p className="text-[11px] text-fg-muted">bookinger</p>
          </div>
          <div className="w-14 shrink-0 text-right">
            <p className="text-sm font-medium text-fg tabular-nums">{d.belegg} %</p>
            <p
              className={`text-[11px] font-medium ${
                d.trend === 'up' ? 'text-success' : 'text-warn'
              }`}
            >
              {d.delta}
            </p>
          </div>
          <ChevronRight size={16} className="shrink-0 text-fg-faint" aria-hidden />
        </li>
      ))}
    </ul>
  );
}
