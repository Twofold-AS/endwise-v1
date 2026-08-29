'use client';

import { useMemo, useState } from 'react';
import {
  osloKalenderdag,
  osloPlusDager,
  osloStartAvDag,
  osloUkedagMandag0,
  osloVeggklokke,
  PRODUKT_TIDSSONE,
} from '../_lib/oslo-dag';
import { osloStartFraFelt, tilOsloDato, tilOsloMinutt, tilOsloTime } from './_starttid';

const TIMER = Array.from({ length: 24 }, (_, i) => i);
const MINUTTER = Array.from({ length: 12 }, (_, i) => i * 5);

function ukerIManed(ymd: string): string[][] {
  const start = `${ymd.slice(0, 7)}-01`;
  const forsteUkedag = osloUkedagMandag0(osloVeggklokke(start, 12, 0));
  const rutenettStart = osloPlusDager(start, -forsteUkedag);
  const uker: string[][] = [];
  for (let u = 0; u < 6; u++) {
    const uke: string[] = [];
    for (let d = 0; d < 7; d++) uke.push(osloPlusDager(rutenettStart, u * 7 + d));
    uker.push(uke);
  }
  return uker;
}

/**
 * Starttid: to expander-knapper. Dato = kalender i Europe/Oslo. Klokke = time+minutt-spinner.
 */
export function StarttidVelger({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso: string) => void;
}) {
  const [apen, setApen] = useState<'dato' | 'klokke' | null>(null);
  const dato = value ? tilOsloDato(value) : osloKalenderdag(new Date());
  const time = value ? tilOsloTime(value) : 8;
  const minutt = value ? tilOsloMinutt(value) : 0;
  const uker = useMemo(() => ukerIManed(dato), [dato]);
  const manedLabel = osloVeggklokke(dato, 12, 0).toLocaleDateString('nb-NO', {
    month: 'long',
    year: 'numeric',
    timeZone: PRODUKT_TIDSSONE,
  });

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
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Forrige måned"
              onClick={() =>
                sett(`${osloPlusDager(`${dato.slice(0, 7)}-01`, -1).slice(0, 8)}01`, time, minutt)
              }
              className="text-label text-fg-muted"
            >
              ←
            </button>
            <span className="text-label capitalize text-fg">{manedLabel}</span>
            <button
              type="button"
              aria-label="Neste måned"
              onClick={() => {
                const [y, m] = dato.split('-').map(Number);
                const neste =
                  m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
                sett(neste, time, minutt);
              }}
              className="text-label text-fg-muted"
            >
              →
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-fg-muted">
            {['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {uker.flat().map((ymd) => {
              const iManed = ymd.slice(0, 7) === dato.slice(0, 7);
              const valgt = ymd === dato;
              return (
                <button
                  key={ymd}
                  type="button"
                  onClick={() => {
                    sett(ymd, time, minutt);
                    setApen(null);
                  }}
                  className={`h-8 rounded-control text-[12px] ${
                    valgt
                      ? 'bg-fg text-bg'
                      : iManed
                        ? 'text-fg hover:bg-surface-2'
                        : 'text-fg-muted'
                  }`}
                >
                  {Number(ymd.slice(8))}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {apen === 'klokke' ? (
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-3">
          <Spinner label="Time" verdi={time} valg={TIMER} onValg={(h) => sett(dato, h, minutt)} />
          <Spinner
            label="Minutt"
            verdi={minutt}
            valg={MINUTTER}
            onValg={(m) => sett(dato, time, m)}
          />
        </div>
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
