'use client';

import { useMemo } from 'react';
import { osloKalenderdag, osloPlusDager, osloVeggklokke } from '../_lib/oslo-dag';
import { CLAUDE_CHIP } from './claude-tokens';

/**
 * Månedsgitter — Claude month popover under ukesrail.
 */
export function TimeplanManedGitter({
  valgt,
  onValgt,
}: {
  valgt: string;
  onValgt: (ymd: string) => void;
}) {
  const ymd = osloKalenderdag(valgt);
  const forste = `${ymd.slice(0, 7)}-01`;
  const dager = useMemo(() => {
    const out: { ymd: string; dag: number; annen: boolean }[] = [];
    const start = osloVeggklokke(forste, 12, 0);
    const wd = (start.getDay() + 6) % 7;
    const startYmd = osloPlusDager(forste, -wd);
    for (let i = 0; i < 42; i++) {
      const d = osloPlusDager(startYmd, i);
      out.push({
        ymd: d,
        dag: Number(d.slice(8, 10)),
        annen: d.slice(0, 7) !== ymd.slice(0, 7),
      });
    }
    return out;
  }, [forste, ymd]);

  return (
    <div data-timeplan-maned-gitter className="grid grid-cols-7 gap-1">
      {['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'].map((l) => (
        <span key={l} className="text-center text-[11px] text-fg-muted">
          {l}
        </span>
      ))}
      {dager.map((d) => {
        const aktiv = d.ymd === ymd;
        return (
          <button
            key={d.ymd}
            type="button"
            data-timeplan-maned-dag={d.ymd}
            onClick={() => onValgt(d.ymd)}
            className={`${CLAUDE_CHIP} h-8 w-full justify-center px-0 ${
              aktiv ? 'bg-fg text-bg' : d.annen ? 'bg-transparent text-fg-faint' : 'bg-field text-fg'
            }`}
          >
            {d.dag}
          </button>
        );
      })}
      <button
        type="button"
        className="col-span-7 mt-1 text-[13px] text-fg-muted"
        onClick={() => onValgt(osloKalenderdag(new Date()))}
      >
        I dag
      </button>
    </div>
  );
}
