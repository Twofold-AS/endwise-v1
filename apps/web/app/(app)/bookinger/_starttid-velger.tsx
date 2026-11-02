'use client';

import { DateCalendar } from '@endwise/ui';
import { parseDate } from '@internationalized/date';
import { useState } from 'react';
import { osloKalenderdag, osloStartAvDag, PRODUKT_TIDSSONE } from '../_lib/oslo-dag';
import { osloStartFraFelt, tilOsloDato, tilOsloMinutt, tilOsloTime } from './_starttid';

const TIMER = Array.from({ length: 24 }, (_, i) => i);
const MINUTTER = Array.from({ length: 12 }, (_, i) => i * 5);

/**
 * Starttid: to expander-knapper. Dato = kalender i Europe/Oslo. Klokke = time+minutt-spinner.
 */
export function StarttidVelger({
  value,
  onChange,
  datoEnabled,
  tillatteTider,
}: {
  value: string;
  onChange: (iso: string) => void;
  /** Claude jobSlots: bare dager med ledig+kvalifisert. */
  datoEnabled?: (ymd: string) => boolean;
  /** 30-min steg fra jobSlots. Uten = 5-min spinner. */
  tillatteTider?: readonly { h: number; m: number }[];
}) {
  const [apen, setApen] = useState<'dato' | 'klokke' | null>(null);
  const dato = value ? tilOsloDato(value) : osloKalenderdag(new Date());
  const time = value ? tilOsloTime(value) : 8;
  const minutt = value ? tilOsloMinutt(value) : 0;

  function sett(ymd: string, h: number, m: number) {
    onChange(osloStartFraFelt(ymd, h, m));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-expanded={apen === 'dato'}
          onClick={() => setApen((v) => (v === 'dato' ? null : 'dato'))}
          className="inline-flex h-control items-center justify-center rounded-control border border-border bg-card px-3 text-label text-fg"
        >
          Dato ·{' '}
          {osloStartAvDag(dato).toLocaleDateString('nb-NO', {
            day: 'numeric',
            month: 'short',
            timeZone: PRODUKT_TIDSSONE,
          })}
        </button>
        <button
          type="button"
          aria-expanded={apen === 'klokke'}
          onClick={() => setApen((v) => (v === 'klokke' ? null : 'klokke'))}
          className="inline-flex h-control items-center justify-center rounded-control border border-border bg-card px-3 text-label text-fg"
        >
          Klokke · {String(time).padStart(2, '0')}:{String(minutt).padStart(2, '0')}
        </button>
      </div>

      {apen === 'dato' ? (
        <div className="rounded-xl border border-border bg-card p-3" data-jobb-dato-kalender>
          <DateCalendar
            aria-label="Velg dato"
            value={parseDate(dato)}
            onChange={(d) => {
              if (!d) return;
              sett(d.toString(), time, minutt);
              setApen(null);
            }}
            isDateUnavailable={datoEnabled ? (date) => !datoEnabled(date.toString()) : undefined}
          />
        </div>
      ) : null}

      {apen === 'klokke' ? (
        tillatteTider ? (
          <div
            data-jobb-slot-tider
            className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3"
          >
            {tillatteTider.length === 0 ? (
              <p className="text-[12px] text-fg-muted">Ingen ledige tider.</p>
            ) : (
              tillatteTider.map((t) => {
                const valgt = t.h === time && t.m === minutt;
                return (
                  <button
                    key={`${t.h}:${t.m}`}
                    type="button"
                    onClick={() => {
                      sett(dato, t.h, t.m);
                      setApen(null);
                    }}
                    className={`h-control rounded-control text-label tabular-nums ${
                      valgt ? 'bg-sidebar-active text-fg' : 'text-fg-muted'
                    }`}
                  >
                    {String(t.h).padStart(2, '0')}:{String(t.m).padStart(2, '0')}
                  </button>
                );
              })
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-3">
            <Spinner label="Time" verdi={time} valg={TIMER} onValg={(h) => sett(dato, h, minutt)} />
            <Spinner
              label="Minutt"
              verdi={minutt}
              valg={MINUTTER}
              onValg={(m) => sett(dato, time, m)}
            />
          </div>
        )
      ) : null}
    </div>
  );
}

function Spinner({
  label,
  verdi,
  valg,
  onValg,
}: {
  label: string;
  verdi: number;
  valg: number[];
  onValg: (n: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12px] text-fg-muted">{label}</span>
      <div
        className="flex h-32 flex-col overflow-y-auto rounded-control border border-border"
        role="listbox"
        aria-label={label}
      >
        {valg.map((n) => (
          <button
            key={n}
            type="button"
            role="option"
            aria-selected={n === verdi}
            onClick={() => onValg(n)}
            className={`h-control shrink-0 text-label tabular-nums ${
              n === verdi ? 'bg-sidebar-active text-fg' : 'text-fg-muted'
            }`}
          >
            {String(n).padStart(2, '0')}
          </button>
        ))}
      </div>
    </div>
  );
}
