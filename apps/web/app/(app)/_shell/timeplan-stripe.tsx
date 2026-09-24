'use client';

import { ChevronLeft, ChevronRight } from '@endwise/ui';
import { useState } from 'react';
import { osloKalenderdag, osloPlusDager } from '../_lib/oslo-dag';
import { timeplanManedNavn, timeplanSkiftManed, timeplanUkeFra } from './timeplan-dager';
import { TimeplanManedGitter } from './timeplan-maned';

const PIL =
  'inline-flex size-control shrink-0 items-center justify-center rounded-control border border-border bg-card text-fg';

const CHIP =
  'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl border px-3 py-2 text-label';

/**
 * Timeplan-stripe: måned + ukesrail (7 dager), Claude-mønster.
 */
export function TimeplanStripe({
  valgt,
  onValgt,
}: {
  valgt: string;
  onValgt: (ymd: string) => void;
}) {
  const dager = timeplanUkeFra(valgt);
  const [manedApen, setManedApen] = useState(false);

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
        <button
          type="button"
          data-timeplan-maned
          aria-expanded={manedApen}
          onClick={() => setManedApen((v) => !v)}
          className="min-w-0 flex-1 text-center text-label text-fg capitalize"
        >
          {timeplanManedNavn(valgt)}
        </button>
        <button
          type="button"
          aria-label="Neste måned"
          onClick={() => onValgt(timeplanSkiftManed(valgt, 1))}
          className={PIL}
        >
          <ChevronRight size={16} strokeWidth={1.75} />
        </button>
      </nav>
      {manedApen ? (
        <TimeplanManedGitter
          valgt={valgt}
          onValgt={(ymd) => {
            onValgt(osloKalenderdag(ymd));
            setManedApen(false);
          }}
        />
      ) : null}

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
