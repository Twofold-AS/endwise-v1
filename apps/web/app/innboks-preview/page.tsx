'use client';

import { MessageSquare } from '@endwise/ui';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { InboxFilterProvider } from '../(app)/_shell/inbox-filter';
import { PHONE_SAFE_TOP } from '../(app)/_shell/phone-home';
import { NyMeldingIkon } from '../(app)/innboks/_ny-melding-ikon';
import { InboxSorteringVelger } from '../(app)/innboks/_sortering';

/**
 * Uinnlogget visuell GO for innboks (tom, sort, telefon-tråd).
 * ?vis=tom|sorter|trad
 */
type Vis = 'tom' | 'sorter' | 'trad';

function lesVis(raw: string | null): Vis {
  if (raw === 'sorter' || raw === 'trad') return raw;
  return 'tom';
}

function InnboksPreviewInner() {
  const vis = lesVis(useSearchParams()?.get('vis') ?? null);
  return (
    <InboxFilterProvider>
      <div
        data-innboks-preview={vis}
        className={`mx-auto flex min-h-dvh w-full max-w-[390px] flex-col bg-bg text-fg ${PHONE_SAFE_TOP}`}
      >
        <header className="shrink-0 border-border border-b px-3 py-2">
          <p className="text-title text-fg">Innboks</p>
        </header>
        {vis === 'trad' ? <TradGo /> : <ListeGo sorterApen={vis === 'sorter'} />}
      </div>
    </InboxFilterProvider>
  );
}

function ListeGo({ sorterApen }: { sorterApen: boolean }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        data-innboks-verktoy
        className="flex shrink-0 items-center gap-1 px-3 py-1.5"
        role="toolbar"
        aria-label="Innboks"
      >
        <InboxSorteringVelger startApen={sorterApen} />
        <div className="ml-auto flex items-center">
          <span className="inline-flex min-h-11 min-w-11 items-center justify-center text-fg">
            ✓
          </span>
          <span className="inline-flex min-h-11 min-w-11 items-center justify-center text-danger">
            ⌫
          </span>
          <button
            type="button"
            data-innboks-ny-samtale
            className="inline-flex min-h-11 min-w-11 items-center justify-center text-fg"
            aria-label="Ny samtale"
          >
            <NyMeldingIkon size={16} />
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-4 py-10 text-center">
        <MessageSquare size={20} className="text-fg-muted" />
        <p className="text-label text-fg">Ingen samtaler</p>
        <p className="text-[12px] text-fg-muted">Innboksen er tom.</p>
        <span className="mt-1 inline-flex h-control items-center rounded-control bg-fg px-3 text-[12px] text-bg">
          Send melding
        </span>
      </div>
    </div>
  );
}

function TradGo() {
  return (
    <div
      data-innboks-hoved
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3"
    >
      <button
        type="button"
        data-innboks-detaljer-chip
        className="absolute top-2 right-2 z-20 inline-flex h-8 items-center rounded-full bg-fg px-3 text-[12px] font-[650] text-bg"
      >
        Detaljer
      </button>
      <h1 className="pr-24 text-title text-fg">Kari Nordmann</h1>
      <p className="mt-1 text-[12px] text-fg-muted">1 melding</p>
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-xl border border-border bg-bg p-3">
        <p className="text-label text-fg">Hei, kan dere ta EU-kontroll i morgen?</p>
      </div>
      <div className="mt-3 flex min-h-11 items-center rounded-control border border-border px-3 text-[13px] text-fg-muted">
        Skriv melding …
      </div>
    </div>
  );
}

export default function InnboksPreview() {
  return (
    <Suspense>
      <InnboksPreviewInner />
    </Suspense>
  );
}
