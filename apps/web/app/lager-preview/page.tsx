'use client';

import { useTema } from '../_lib/tema-provider';
import {
  INGEN_API,
  LAGER_HUB_SEKSJONER,
  LAGER_STAT_LABELS,
  lagerPageSub,
} from '../(app)/lager/_hub';

/**
 * Uinnlogget visuell GO for Lager-hub (BIT 6). Live: /lager
 */
export default function LagerPreview() {
  const { los, sett } = useTema();
  return (
    <div data-lager-preview className="min-h-dvh bg-bg text-fg">
      <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col gap-4 px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-title text-fg">Lager</p>
          <button
            type="button"
            className="text-label text-fg-muted"
            onClick={() => sett(los === 'dark' ? 'light' : 'dark')}
          >
            {los === 'dark' ? 'Lys' : 'Mørk'}
          </button>
        </div>
        <p className="text-[12px] text-fg-muted">{lagerPageSub(0)} · live /lager</p>
        <div data-lager-stats className="grid grid-cols-2 gap-2">
          {LAGER_STAT_LABELS.map((l) => (
            <div key={l} className="rounded-xl border border-border bg-card p-3">
              <p className="text-[12px] text-fg-muted">{l}</p>
              <p className="text-title tabular-nums">0</p>
            </div>
          ))}
        </div>
        <nav
          data-lager-hub-seksjoner
          className="flex flex-col overflow-hidden rounded-xl border border-border"
        >
          {LAGER_HUB_SEKSJONER.map((s) => (
            <div
              key={s.id}
              className="flex justify-between gap-3 border-border border-b px-4 py-3 last:border-b-0"
            >
              <span className="text-label">{s.label}</span>
              <span className="text-[12px] text-fg-muted">{s.sub}</span>
            </div>
          ))}
        </nav>
        <p className="text-[12px] text-fg-muted">Bestill / Finn.no · {INGEN_API}</p>
      </div>
    </div>
  );
}
