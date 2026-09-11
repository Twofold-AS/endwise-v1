'use client';

import { InboxFilterProvider } from '../(app)/_shell/inbox-filter';
import { PHONE_BAR2, PHONE_PROFIL_SIRKEL, PHONE_RONNY_SIRKEL } from '../(app)/_shell/phone-chrome';
import { PhoneProfilMeny } from '../(app)/_shell/phone-profil-meny';
import { phoneSideChrome } from '../(app)/_shell/phone-side-chrome';
import { PulseJobbFlis } from '../(app)/_shell/pulse-kort';
import { SideChromeSkall } from '../(app)/_shell/side-chrome-skall';
import { RonnyBot } from '../(app)/_workshop/ronny-bot';
import type { RonnyAnsikt } from '../(app)/_workshop/ronny-idle';
import { InboxTopBar2 } from '../(app)/innboks/_top-bar2';
import { OrgRad } from '../(app)/organisasjon/_org-rad';

/**
 * Midlertidig visuell GO-flate (uten innlogging). Ikke en produkt-rute.
 * Viser Innstillinger-chrome for Timeplan / Kunder / Tjenester / Org / Innboks + profil.
 */

const SIDER: { sti: string; query?: Record<string, string> }[] = [
  { sti: '/jobber' },
  { sti: '/jobber', query: { fane: 'endringer' } },
  { sti: '/kunder' },
  { sti: '/prisliste' },
  { sti: '/organisasjon' },
  { sti: '/innboks' },
];

const RONNY_ANSIKT: { id: RonnyAnsikt; label: string }[] = [
  { id: 'curieux', label: 'Curious' },
  { id: 'heureux', label: 'Happy' },
  { id: 'wink', label: 'Wink' },
  { id: 'surpris', label: 'Surprised' },
];

function PreviewSok(query?: Record<string, string>) {
  return {
    get: (k: string) => query?.[k] ?? null,
  };
}

function PhoneChromeMock({ sti, query }: { sti: string; query?: Record<string, string> }) {
  const chrome = phoneSideChrome(sti, PreviewSok(query), {
    isAdmin: true,
    erForhandler: true,
  });
  if (!chrome) return null;
  return (
    <div
      data-ia-chrome-preview={chrome.id}
      className="overflow-hidden rounded-[16px] bg-bg ring-1 ring-divide"
    >
      <div data-phone-top-bar="1" className="flex h-row w-full items-center gap-2 px-3">
        <span data-shell-logo className="inline-flex size-8 shrink-0 rounded-sm bg-fg" />
        <span className="min-w-0 flex-1 rounded-full bg-inset px-3 py-1 text-label text-fg-muted">
          Søk
        </span>
        <span className={PHONE_RONNY_SIRKEL}>
          <RonnyBot size={44} ansikt="heureux" />
        </span>
        <span className={PHONE_PROFIL_SIRKEL}>M</span>
      </div>
      <div data-phone-side-tittel className="flex h-8 items-end px-3">
        <h1 className="truncate text-title text-fg">{chrome.tittel}</h1>
      </div>
      <div data-phone-top-bar="2" className={PHONE_BAR2}>
        {chrome.bar2 === 'innboks' ? (
          <InboxFilterProvider>
            <InboxTopBar2 />
          </InboxFilterProvider>
        ) : (
          <nav
            data-phone-settings-nav
            data-phone-side-nav={chrome.id}
            aria-label={chrome.tittel}
            className="flex min-w-0 flex-1 items-end gap-5 overflow-x-auto"
          >
            {chrome.faner.map((f) => {
              const aktiv = f.id === chrome.aktiv;
              return (
                <span
                  key={f.id}
                  data-phone-settings-fane={f.id}
                  aria-current={aktiv ? 'page' : undefined}
                  className={`shrink-0 border-b-2 pb-1 text-label ${
                    aktiv ? 'border-fg font-[650] text-fg' : 'border-transparent text-fg-muted'
                  }`}
                >
                  {f.label}
                </span>
              );
            })}
          </nav>
        )}
      </div>
      <div className="h-px bg-border" />
    </div>
  );
}

export default function IaChromePreview() {
  return (
    <div className="min-h-dvh bg-bg text-fg" data-ia-chrome-preview="go">
      <div className="mx-auto flex w-full max-w-[520px] flex-col gap-8 px-3 py-5">
        <p className="text-title text-fg">IA-chrome preview</p>

        {SIDER.map((s) => (
          <PhoneChromeMock key={`${s.sti}:${s.query?.fane ?? ''}`} sti={s.sti} query={s.query} />
        ))}

        <section data-ia-chrome-preview="ronny" className="flex flex-col gap-3">
          <p className="text-title text-fg">Ronny</p>
          <div className="grid grid-cols-4 gap-3">
            {RONNY_ANSIKT.map((r) => (
              <div key={r.id} className="flex flex-col items-center gap-2">
                <span className={PHONE_RONNY_SIRKEL}>
                  <RonnyBot size={44} ansikt={r.id} />
                </span>
                <span className="text-[12px] text-fg-muted">{r.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section data-ia-chrome-preview="jobb" className="flex flex-col gap-3">
          <p className="text-title text-fg">Jobb-rad</p>
          <PulseJobbFlis />
        </section>

        <SideChromeSkall
          tittel="Timeplan"
          ingress="Desktop-chrome, samme underline som Innstillinger."
          faner={[
            { id: 'timeplan', label: 'Timeplan', href: '/jobber' },
            { id: 'opprett', label: 'Opprett jobb', href: '/bookinger/ny' },
            { id: 'endringer', label: 'Endringer', href: '/jobber?fane=endringer' },
          ]}
          aktiv="endringer"
        >
          <div data-timeplan-endringer-flate className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-5">
              <span
                data-endringer-fane="avvik"
                className="inline-flex items-center border-fg border-b-2 pb-1 text-label font-[650] text-fg"
              >
                Avvik
              </span>
              <span
                data-endringer-fane="forespor"
                className="inline-flex items-center border-transparent border-b-2 pb-1 text-label text-fg-muted"
              >
                Forespørsler
              </span>
            </div>
            <p className="text-body text-fg-muted">Ingen ventende avvik.</p>
          </div>
        </SideChromeSkall>

        <SideChromeSkall
          tittel="Organisasjon"
          ingress="Ansatte, abonnement og integrasjoner."
          faner={[
            {
              id: 'oversikt',
              label: 'Oversikt',
              href: '/organisasjon',
              ingress: 'Navn, org.nr og kontakt som vises i appen.',
            },
          ]}
          aktiv="oversikt"
        >
          <div data-org-oversikt className="flex flex-col">
            <OrgRad label="Firmanavn" verdi="Endwise Demo" onEndre={() => undefined} />
            <OrgRad label="Slug" verdi="endwise-demo" lesing />
            <OrgRad label="Orgnr" verdi="999 999 999" onEndre={() => undefined} />
            <OrgRad label="Telefon" verdi="22 00 00 00" onEndre={() => undefined} siste />
          </div>
        </SideChromeSkall>

        <section data-ia-chrome-preview="profil" className="relative min-h-[420px]">
          <p className="mb-3 text-title text-fg">Profilmeny</p>
          <div className="relative overflow-visible rounded-[16px] bg-bg ring-1 ring-divide">
            <div data-phone-top-bar="1" className="relative flex h-row w-full items-center px-3">
              <span className="ml-auto">
                <span className={PHONE_PROFIL_SIRKEL}>M</span>
              </span>
              <PhoneProfilMeny
                apen
                onLukk={() => undefined}
                navn="Mikael"
                epost="mikael@twofold.no"
                innstillingerHref="/innstillinger"
                tvingVis
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
