'use client';

import { MessageSquare } from '@endwise/ui';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { InboxFilterProvider } from '../(app)/_shell/inbox-filter';
import { InnstillingRad, InnstillingSeksjon } from '../(app)/_shell/innstilling-gruppe';
import {
  PHONE_BAR2,
  PHONE_PROFIL_SIRKEL,
  PHONE_RONNY_SIRKEL,
  PHONE_SIDE_UNDER,
} from '../(app)/_shell/phone-chrome';
import { PHONE_SAFE_TOP } from '../(app)/_shell/phone-home';
import { InboxTopBar2 } from '../(app)/innboks/_top-bar2';

/**
 * Uinnlogget visuell GO for innboks (Settings-chrome + top-bar 2).
 * ?vis=tom|sorter|gruppe|slett|trad|liste|ny
 */
type Vis = 'tom' | 'sorter' | 'gruppe' | 'slett' | 'trad' | 'liste' | 'ny';

function lesVis(raw: string | null): Vis {
  if (
    raw === 'sorter' ||
    raw === 'gruppe' ||
    raw === 'slett' ||
    raw === 'trad' ||
    raw === 'liste' ||
    raw === 'ny'
  ) {
    return raw;
  }
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
        <div data-phone-top-bar="1" className="flex h-row w-full items-center gap-2 px-3">
          <span data-shell-logo className="inline-flex size-8 shrink-0 rounded-sm bg-fg" />
          <span className="min-w-0 flex-1 rounded-full bg-inset px-3 py-1 text-label text-fg-muted">
            Søk
          </span>
          <span className={PHONE_RONNY_SIRKEL} />
          <span className={PHONE_PROFIL_SIRKEL}>M</span>
        </div>
        <div data-phone-top-bar="2" className={PHONE_BAR2}>
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
            <span
              data-phone-dest="home"
              className="inline-flex h-8 shrink-0 items-center rounded-full px-3 text-label text-fg"
            >
              Verkstedet
            </span>
            <span
              data-phone-dest="innboks"
              className="inline-flex h-8 shrink-0 items-center rounded-full bg-sidebar-active px-3 text-label text-fg"
            >
              Innboks
            </span>
            <span
              data-phone-dest="saker"
              className="inline-flex h-8 shrink-0 items-center rounded-full px-3 text-label text-fg"
            >
              Timeplan
            </span>
            <span
              data-phone-dest="kunder"
              className="inline-flex h-8 shrink-0 items-center rounded-full px-3 text-label text-fg"
            >
              Kunder
            </span>
          </div>
        </div>
        <div data-phone-side-under className={PHONE_SIDE_UNDER}>
          <h1 data-phone-side-tittel className="truncate text-title font-[650] leading-6 text-fg">
            Innboks
          </h1>
          <div data-phone-side-verktoy className="flex min-h-8 min-w-0 items-end">
            <InboxTopBar2
              startPopup={vis === 'sorter' || vis === 'gruppe' ? 'sortering' : undefined}
            />
          </div>
        </div>
        <div className="h-px bg-border" />
        {vis === 'trad' ? <TradGo /> : vis === 'ny' ? <NyMeldingGo /> : <ListeGo vis={vis} />}
      </div>
    </InboxFilterProvider>
  );
}

const PREVIEW_TRADER = [
  { id: '1', navn: 'Kari Nordmann', utdrag: 'EU-kontroll i morgen?', nar: '12.09', ulest: true },
  { id: '2', navn: 'Support', utdrag: 'Takket for oppdateringen.', nar: '11.09', ulest: false },
  { id: '3', navn: 'Intern · Mek', utdrag: 'Trenger del til EL12345.', nar: '10.09', ulest: false },
] as const;

function ListeGo({ vis }: { vis: Vis }) {
  const visRader = vis === 'slett' || vis === 'liste' || vis === 'sorter' || vis === 'gruppe';
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3">
      {visRader ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {PREVIEW_TRADER.map((t, i) => (
            <button
              key={t.id}
              type="button"
              data-innboks-velg={`preview-${t.id}`}
              className="flex w-full items-start gap-2 text-left"
            >
              {vis === 'slett' ? (
                <span
                  className={`mt-5 size-4 shrink-0 rounded-sm border ${
                    i === 0 ? 'border-fg bg-fg' : 'border-border bg-bg'
                  }`}
                  aria-hidden
                />
              ) : null}
              <span
                data-innboks-rad
                className={`min-w-0 flex-1 border-border border-b py-4 ${
                  i === 0 ? 'bg-sidebar-active' : 'bg-transparent'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-label text-fg">{t.navn}</span>
                  <span className="shrink-0 text-[11px] text-fg-muted tabular-nums">{t.nar}</span>
                </span>
                <span className="mt-1 block truncate text-[12px] text-fg-muted">{t.utdrag}</span>
              </span>
            </button>
          ))}
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

function NyMeldingGo() {
  return (
    <form data-ny-melding-skjema className="flex flex-col gap-8 px-3 py-4">
      <InnstillingSeksjon tittel="Mottaker" ingress="Gruppe og person i samme feltgruppe.">
        <InnstillingRad label="Gruppe">
          <div
            data-ny-samtale-knapperad
            className="inline-flex h-control items-center gap-0.5 rounded-control border border-border bg-bg p-0.5"
          >
            <span className="inline-flex h-7 items-center rounded-[7px] bg-sidebar-active px-2.5 text-label text-fg">
              Kunder
            </span>
            <span className="inline-flex h-7 items-center rounded-[7px] px-2.5 text-label text-fg-muted">
              Internt
            </span>
            <span className="inline-flex h-7 items-center rounded-[7px] px-2.5 text-label text-fg-muted">
              Support
            </span>
          </div>
        </InnstillingRad>
        <InnstillingRad label="Valgt" hint="Kari Nordmann">
          <input
            readOnly
            defaultValue="Kari"
            aria-label="Søk i mottakerlista"
            className="h-control ew-felt ew-felt-md px-3"
          />
        </InnstillingRad>
      </InnstillingSeksjon>
      <InnstillingSeksjon tittel="Melding">
        <InnstillingRad label="Emne" hint="Valgfritt">
          <input
            readOnly
            defaultValue="EU-kontroll"
            className="h-control ew-felt ew-felt-md px-3"
          />
        </InnstillingRad>
        <InnstillingRad label="Tekst" siste>
          <textarea
            readOnly
            rows={3}
            defaultValue="Kan dere ta EU i morgen?"
            className="min-h-[96px] resize-y ew-felt ew-felt-md px-3 py-2"
          />
        </InnstillingRad>
      </InnstillingSeksjon>
      <div className="flex justify-end" data-ny-melding-send>
        <span className="inline-flex h-control items-center rounded-control bg-fg px-4 text-label text-bg">
          Send
        </span>
      </div>
    </form>
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
