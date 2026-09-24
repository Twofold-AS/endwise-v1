'use client';

import { CalendarDays, ChevronLeft, ChevronRight } from '@endwise/ui';
import { useState } from 'react';
import { osloKalenderdag } from '../_lib/oslo-dag';
import {
  timeplanManedDager,
  timeplanManedNavn,
  timeplanSkiftManed,
  timeplanSkiftUke,
  timeplanUkeFra,
} from './timeplan-dager';

const PIL =
  'inline-flex size-control shrink-0 items-center justify-center rounded-control border border-border bg-card text-fg';

const CHIP =
  'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl border px-1 py-2 text-label';

const UKE_NB = ['ma', 'ti', 'on', 'to', 'fr', 'lø', 'sø'] as const;

/**
 * Timeplan-stripe: uke-rail (7 dager, mandag først) + månedspicker.
 * Samme komponent på Timeplan, Kalender og Min dag.
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
  const manedDager = timeplanManedDager(valgt);

  return (
    <div data-timeplan-stripe className="flex flex-col gap-2">
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
          aria-haspopup="dialog"
          onClick={() => setManedApen((v) => !v)}
          className="min-w-0 flex-1 inline-flex items-center justify-center gap-1.5 text-center text-label text-fg capitalize"
        >
          <CalendarDays size={14} strokeWidth={1.75} className="text-fg-muted" />
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
            data-timeplan-maned-ark
            role="dialog"
            aria-label="Velg dag"
            className="absolute top-full right-0 left-0 z-20 mt-1 rounded-[16px] border border-border bg-card p-3"
          >
            <p className="mb-2 text-[11px] text-fg-muted">Velg dag i måneden.</p>
            <div className="mb-1 grid grid-cols-7 gap-1">
              {UKE_NB.map((u) => (
                <span key={u} className="text-center text-[10px] uppercase text-fg-muted">
                  {u}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {manedDager.map((d) => {
                const aktiv = d.ymd === osloKalenderdag(valgt);
                return (
                  <button
                    key={d.ymd}
                    type="button"
                    data-timeplan-maned-dag={d.ymd}
                    disabled={!d.iManed}
                    onClick={() => {
                      onValgt(d.ymd);
                      setManedApen(false);
                    }}
                    className={`h-8 rounded-lg text-[12px] tabular-nums ${
                      aktiv
                        ? 'bg-fg text-bg'
                        : d.iManed
                          ? 'text-fg hover:bg-surface-2'
                          : 'text-fg-faint'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="mt-2 w-full text-center text-[12px] text-fg-muted"
              onClick={() => setManedApen(false)}
            >
              Lukk måned
            </button>
          </div>
        ) : null}
      </nav>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Forrige uke"
          onClick={() => onValgt(timeplanSkiftUke(valgt, -1))}
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
                data-timeplan-dag={d.ymd}
                onClick={() => onValgt(d.ymd)}
                className={`${CHIP} ${
                  aktiv
                    ? 'border-fg bg-sidebar-active text-fg'
                    : 'border-border bg-card text-fg-muted'
                }`}
              >
                <span className="text-[10px] uppercase">{d.weekday}</span>
                <span className="font-medium text-[13px] tabular-nums">
                  {d.label.split('.')[0]}
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-label="Neste uke"
          onClick={() => onValgt(timeplanSkiftUke(valgt, 1))}
          className={PIL}
        >
          <ChevronRight size={16} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
