'use client';

import { ChevronLeft, ChevronRight } from '@endwise/ui';
import { osloKalenderdag, osloPlusDager } from '../_lib/oslo-dag';
import { timeplanDagerFra, timeplanManeder } from './timeplan-dager';

const CHIP =
  'flex min-w-[56px] shrink-0 flex-col items-center gap-0.5 rounded-xl border px-3 py-2 text-label';

/**
 * Timeplan-dager: måned over, piler i stedet for scroll, valgt dag ytterst til venstre.
 */
export function TimeplanStripe({
  valgt,
  onValgt,
}: {
  valgt: string;
  onValgt: (ymd: string) => void;
}) {
  const dager = timeplanDagerFra(valgt, 7);
  const maneder = timeplanManeder(valgt);

  return (
    <div className="flex flex-col gap-2">
      <div role="tablist" aria-label="Måned" className="flex gap-2 overflow-hidden">
        {maneder.map((m) => (
          <button
            key={m.ymd}
            type="button"
            role="tab"
            aria-selected={m.aktiv}
            onClick={() => onValgt(m.aktiv ? valgt : osloKalenderdag(m.ymd))}
            className={`${CHIP} ${
              m.aktiv
                ? 'border-fg bg-sidebar-active text-fg'
                : 'border-border bg-card text-fg-muted'
            }`}
          >
            <span className="capitalize">{m.label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Forrige dag"
          onClick={() => onValgt(osloPlusDager(valgt, -1))}
          className="inline-flex size-control shrink-0 items-center justify-center rounded-control border border-border bg-card text-fg"
        >
          <ChevronLeft size={16} strokeWidth={1.75} />
        </button>
        <div className="flex min-w-0 flex-1 gap-2 overflow-hidden">
          {dager.map((d) => {
            const aktiv = d.ymd === valgt;
            return (
              <button
                key={d.ymd}
                type="button"
                onClick={() => onValgt(d.ymd)}
                className={`${CHIP} ${
                  aktiv
                    ? 'border-fg bg-sidebar-active text-fg'
                    : 'border-border bg-card text-fg-muted'
                }`}
              >
                <span className="text-[10px] uppercase">{d.weekday}</span>
                <span className="font-medium text-[13px]">{d.label}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-label="Neste dag"
          onClick={() => onValgt(osloPlusDager(valgt, 1))}
          className="inline-flex size-control shrink-0 items-center justify-center rounded-control border border-border bg-card text-fg"
        >
          <ChevronRight size={16} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
