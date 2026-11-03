'use client';

import { DatePicker } from '@endwise/ui';
import { parseDate } from '@internationalized/date';
import { osloKalenderdag } from '../_lib/oslo-dag';
import { timeplanManedNavn, timeplanUkeFra } from './timeplan-dager';

/**
 * Timeplan-stripe: 7 dagchips i grid + DatePicker for måned.
 * Ukedag = to bokstaver uten punktum. Aktiv dag = ink-sirkel.
 */
export function TimeplanStripe({
  valgt,
  onValgt,
}: {
  valgt: string;
  onValgt: (ymd: string) => void;
}) {
  const dager = timeplanUkeFra(valgt);

  return (
    <div data-timeplan-stripe className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-label capitalize text-fg">{timeplanManedNavn(valgt)}</p>
        <div data-timeplan-maned>
          <DatePicker
            aria-label="Velg dag"
            value={parseDate(osloKalenderdag(valgt))}
            onChange={(d) => {
              if (!d) return;
              onValgt(d.toString());
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dager.map((d) => {
          const aktiv = d.ymd === valgt;
          return (
            <button
              key={d.ymd}
              type="button"
              data-timeplan-dag={d.ymd}
              onClick={() => onValgt(d.ymd)}
              className="flex h-11 min-w-0 flex-col items-center justify-center gap-0.5"
            >
              <span className="text-meta text-fg-muted">{d.weekday}</span>
              <span
                className={`inline-flex size-8 items-center justify-center rounded-full text-label tabular-nums ${
                  aktiv ? 'bg-fg text-bg' : 'text-fg'
                }`}
              >
                {Number(d.ymd.slice(8, 10))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
