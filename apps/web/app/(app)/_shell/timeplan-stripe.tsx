'use client';

import { ChevronLeft, ChevronRight } from '@endwise/ui';
import { useState } from 'react';
import { osloPlusDager } from '../_lib/oslo-dag';
import { timeplanManedNavn, timeplanSkiftManed, timeplanUkeFra } from './timeplan-dager';
import { timeplanManedRutenett } from './timeplan-maned-rutenett';

const PIL =
  'inline-flex size-control shrink-0 items-center justify-center rounded-control border border-border bg-card text-fg';

const CHIP =
  'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl border px-1 py-1.5 text-[11px]';

/**
 * Timeplan-stripe: ukesrail 7 dager + månedspopover.
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
  const celler = timeplanManedRutenett(valgt);

  return (
    <div className="flex flex-col gap-2" data-timeplan-uke>
      <nav aria-label="Måned" className="relative flex items-center gap-1">
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
          className="min-w-0 flex-1 text-center text-label text-fg capitalize"
          onClick={() => setManedApen((v) => !v)}
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
        {manedApen ? (
          <div
            data-timeplan-maned-popover
            className="absolute top-full right-0 left-0 z-20 mt-1 rounded-[24px] border border-divide bg-card p-3 shadow-none"
          >
            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] text-fg-muted">
              {['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {celler.map((c) =>
                c.utenfor ? (
                  <span key={c.nokkel} />
                ) : (
                  <button
                    key={c.nokkel}
                    type="button"
                    onClick={() => {
                      onValgt(c.ymd);
                      setManedApen(false);
                    }}
                    className={`h-8 rounded-full text-[12px] ${
                      c.ymd === valgt ? 'bg-fg text-bg' : 'text-fg hover:bg-surface-2'
                    }`}
                  >
                    {c.dag}
                  </button>
                ),
              )}
            </div>
          </div>
        ) : null}
      </nav>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Forrige uke"
          onClick={() => onValgt(osloPlusDager(valgt, -7))}
          className={PIL}
        >
          <ChevronLeft size={16} strokeWidth={1.75} />
        </button>
        <div className="flex min-w-0 flex-1 gap-1">
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
                <span className="font-medium text-[12px]">{d.label}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-label="Neste uke"
          onClick={() => onValgt(osloPlusDager(valgt, 7))}
          className={PIL}
        >
          <ChevronRight size={16} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
