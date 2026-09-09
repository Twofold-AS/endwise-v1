'use client';

import { MessageSquare } from '@endwise/ui';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { InboxFilterProvider } from '../(app)/_shell/inbox-filter';
import { PHONE_BAR2, PHONE_PROFIL_SIRKEL, PHONE_RONNY_SIRKEL } from '../(app)/_shell/phone-chrome';
import { PHONE_SAFE_TOP } from '../(app)/_shell/phone-home';
import { InboxTopBar2 } from '../(app)/innboks/_top-bar2';

/**
 * Uinnlogget visuell GO for innboks (Settings-chrome + top-bar 2).
 * ?vis=tom|sorter|gruppe|slett|trad
 */
type Vis = 'tom' | 'sorter' | 'gruppe' | 'slett' | 'trad';

function lesVis(raw: string | null): Vis {
  if (raw === 'sorter' || raw === 'gruppe' || raw === 'slett' || raw === 'trad') return raw;
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
        <div data-phone-top-bar="1" className="relative flex h-row w-full items-center gap-2 px-3">
          <span className="relative z-10 inline-flex size-8 shrink-0 items-center justify-start text-fg">
            ←
          </span>
          <p className="pointer-events-none absolute inset-x-10 truncate text-center text-title text-fg">
            Innboks
          </p>
          <div className="relative z-10 ml-auto flex shrink-0 items-center gap-2">
            <span className={PHONE_RONNY_SIRKEL} />
            <span className={PHONE_PROFIL_SIRKEL}>M</span>
          </div>
        </div>
        <div data-phone-top-bar="2" className={PHONE_BAR2}>
          <InboxTopBar2 />
        </div>
        <div className="h-px bg-border" />
        {vis === 'trad' ? <TradGo /> : <ListeGo vis={vis} />}
      </div>
    </InboxFilterProvider>
  );
}

function ListeGo({ vis }: { vis: Vis }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {vis === 'slett' ? (
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-2">
          <button
            type="button"
            data-innboks-velg="preview-1"
            className="flex w-full items-start gap-2 text-left"
          >
            <span className="mt-3 size-4 shrink-0 rounded-sm border border-fg bg-fg" aria-hidden />
            <span className="min-w-0 flex-1 rounded-control border border-border px-3 py-2.5">
              <p className="text-label text-fg">Kari Nordmann</p>
              <p className="text-[12px] text-fg-muted">EU-kontroll i morgen?</p>
            </span>
          </button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-4 py-10 text-center">
          <MessageSquare size={20} className="text-fg-muted" />
          <p className="text-label text-fg">Ingen samtaler</p>
          <p className="text-[12px] text-fg-muted">Innboksen er tom.</p>
          <span className="mt-1 inline-flex h-control items-center rounded-control bg-fg px-3 text-[12px] text-bg">
            Send melding
          </span>
        </div>
      )}
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
