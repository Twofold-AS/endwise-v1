'use client';

import { useTema } from '../_lib/tema-provider';
import { butikkPageSub, INGEN_API, SALG_KANALER } from '../(app)/lager/_hub';

/**
 * Uinnlogget visuell GO for Butikk-hub (BIT 6). Live: /butikk
 */
export default function ButikkPreview() {
  const { los, sett } = useTema();
  return (
    <div data-butikk-preview className="min-h-dvh bg-bg text-fg">
      <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col gap-4 px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-title text-fg">Butikk</p>
          <button
            type="button"
            className="text-label text-fg-muted"
            onClick={() => sett(los === 'dark' ? 'light' : 'dark')}
          >
            {los === 'dark' ? 'Lys' : 'Mørk'}
          </button>
        </div>
        <p className="text-[12px] text-fg-muted">{butikkPageSub(0, 0)} · live /butikk</p>
        <p className="text-[12px] text-fg-muted">Ny · {INGEN_API}</p>
        <section data-butikk-varer>
          <p className="text-label">Varer i nettbutikk</p>
          <p className="text-[12px] text-fg-muted">
            Preview 3 · Se alle. Katalog fra shop.catalog live.
          </p>
        </section>
        <section data-butikk-kjoretoy>
          <p className="text-label">Kjøretøy til salgs</p>
          <p className="text-[12px] text-fg-muted">Ingen listing-API. Ingen seed-katalog.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SALG_KANALER.map((k) => (
              <span
                key={k}
                className="rounded-full bg-surface-2 px-2.5 py-1 text-[12px] text-fg-muted"
              >
                {k} · {INGEN_API}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
