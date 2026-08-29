'use client';

import { ChevronLeft, ChevronRight } from '@endwise/ui';
import { osloPlusDager } from '../_lib/oslo-dag';
import { timeplanDagerFra, timeplanManedNavn, timeplanSkiftManed } from './timeplan-dager';

const PIL =
  'inline-flex size-control shrink-0 items-center justify-center rounded-control border border-border bg-card text-fg';

const CHIP =
  'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl border px-3 py-2 text-label';

/**
 * Timeplan-stripe: én måned i midten med piler, tre hele dag-chips uten klipp.
 */
export function TimeplanStripe({
  valgt,
  onValgt,
}: {
  valgt: string;
  onValgt: (ymd: string) => void;
}) {
  const dager = timeplanDagerFra(valgt, 3);

  return (
    <div className="flex flex-col gap-2">
      <nav aria-label="Måned" className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Forrige måned"
          onClick={() => onValgt(timeplanSkiftManed(valgt, -1))}
          className={PIL}
        >
          <ChevronLeft size={16} strokeWidth={1.75} />
        </button>
        <p className="min-w-0 flex-1 text-center text-label text-fg capitalize">
          {timeplanManedNavn(valgt)}
        </p>
        <button
          type="button"
          aria-label="Neste måned"
          onClick={() => onValgt(timeplanSkiftManed(valgt, 1))}
          className={PIL}
        >
          <ChevronRight size={16} strokeWidth={1.75} />
        </button>
      </nav>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Forrige dag"
          onClick={() => onValgt(osloPlusDager(valgt, -1))}
          className={PIL}
        >
          <ChevronLeft size={16} strokeWidth={1.75} />
        </button>
        <div className="flex min-w-0 flex-1 gap-2">
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
          className={PIL}
        >
          <ChevronRight size={16} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
