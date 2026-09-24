'use client';

import { useTema } from '../_lib/tema-provider';
import {
  ansattePageSub,
  INGEN_API,
  INTEGRASJONER_PAGE_SUB,
  ORG_HUB_SEKSJONER,
  aboPageSub,
} from '../(app)/organisasjon/_hub';

/**
 * Uinnlogget visuell GO for Organisasjon-hub (BIT 7). Live: /organisasjon
 */
export default function OrgPreview() {
  const { los, sett } = useTema();
  return (
    <div data-org-preview className="min-h-dvh bg-bg text-fg">
      <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col gap-4 px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-title text-fg">Organisasjon</p>
          <button
            type="button"
            className="text-label text-fg-muted"
            onClick={() => sett(los === 'dark' ? 'light' : 'dark')}
          >
            {los === 'dark' ? 'Lys' : 'Mørk'}
          </button>
        </div>
        <p className="text-[12px] text-fg-muted">live /organisasjon · chrome urørt</p>
        <nav
          data-org-hub-seksjoner
          className="flex flex-col overflow-hidden rounded-xl border border-border"
        >
          {ORG_HUB_SEKSJONER.map((s) => (
            <div
              key={s.id}
              className="flex justify-between gap-3 border-border border-b px-4 py-3 last:border-b-0"
            >
              <span className="text-label">{s.label}</span>
              <span className="text-[12px] text-fg-muted">{s.sub}</span>
            </div>
          ))}
        </nav>
        <section data-org-timeplan-ansatte className="rounded-xl border border-border px-4 py-3">
          <p className="text-label">Timeplan ansatte</p>
          <p className="text-[12px] text-fg-muted">Vaktliste per ukedag · {INGEN_API}</p>
        </section>
        <p data-ansatte-pagesub className="text-[12px] text-fg-muted">
          {ansattePageSub(0, 0)}
        </p>
        <p className="text-[12px] text-fg-muted">
          Sett tid · {INGEN_API}. Slett = team.fjern live.
        </p>
        <p data-abo-pagesub className="text-[12px] text-fg-muted">
          {aboPageSub(null)}
        </p>
        <p data-integrasjoner-pagesub className="text-[12px] text-fg-muted">
          {INTEGRASJONER_PAGE_SUB}
        </p>
        <p className="text-[12px] text-fg-muted">Ingen Hellanor/Mailchimp-brytere.</p>
      </div>
    </div>
  );
}
