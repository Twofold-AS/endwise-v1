'use client';

import { useTema } from '../_lib/tema-provider';
import { TJENESTER_FANER } from '../(app)/prisliste/_faner';
import { tjenesterPageSub } from '../(app)/prisliste/_hub';

/**
 * Uinnlogget visuell GO for Tjenester (BIT 7). Live: /prisliste
 */
export default function TjenesterPreview() {
  const { los, sett } = useTema();
  return (
    <div data-tjenester-preview className="min-h-dvh bg-bg text-fg">
      <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col gap-4 px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-title text-fg">Tjenester</p>
          <button
            type="button"
            className="text-label text-fg-muted"
            onClick={() => sett(los === 'dark' ? 'light' : 'dark')}
          >
            {los === 'dark' ? 'Lys' : 'Mørk'}
          </button>
        </div>
        <p data-tjenester-pagesub className="text-[12px] text-fg-muted">
          {tjenesterPageSub(0)} · live /prisliste
        </p>
        <p className="text-[12px] text-fg-muted">
          Chrome: {TJENESTER_FANER.map((f) => f.label).join(' · ')}. Ingen ny pille.
        </p>
        <p className="text-[12px] text-fg-muted">Søk · Alle / MC / Båt / ATV · Ny → Opprett</p>
        <p className="text-[12px] text-fg-muted">Detalj: varighet · pris · ferdigheter — live.</p>
      </div>
    </div>
  );
}
