'use client';

import { PHONE_BAR2, PHONE_PROFIL_SIRKEL, PHONE_RONNY_SIRKEL } from '../(app)/_shell/phone-chrome';
import { phoneSideChrome } from '../(app)/_shell/phone-side-chrome';
import { PulseJobbFlis } from '../(app)/_shell/pulse-kort';
import { SideChromeSkall } from '../(app)/_shell/side-chrome-skall';
import { RonnyBot } from '../(app)/_workshop/ronny-bot';
import type { RonnyAnsikt } from '../(app)/_workshop/ronny-idle';

/**
 * Midlertidig visuell GO-flate (uten innlogging). Ikke en produkt-rute.
 * Viser Innstillinger-chrome for Timeplan / Kunder / Tjenester / Org + Ronny.
 */

const SIDER: { sti: string; query?: Record<string, string> }[] = [
  { sti: '/jobber' },
  { sti: '/kunder' },
  { sti: '/prisliste' },
  { sti: '/organisasjon' },
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
      <div data-phone-top-bar="1" className="relative flex h-row w-full items-center gap-2 px-3">
        <span className="relative z-10 inline-flex size-8 shrink-0 items-center justify-start text-fg">
          ←
        </span>
        <p className="pointer-events-none absolute inset-x-10 truncate text-center text-title text-fg">
          {chrome.tittel}
        </p>
        <div className="relative z-10 ml-auto flex shrink-0 items-center gap-2">
          <span className={PHONE_RONNY_SIRKEL}>
            <RonnyBot size={44} ansikt="heureux" />
          </span>
          <span className={PHONE_PROFIL_SIRKEL}>M</span>
        </div>
      </div>
      <div data-phone-top-bar="2" className={PHONE_BAR2}>
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
          <PhoneChromeMock key={s.sti} sti={s.sti} query={s.query} />
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
            { id: 'avvik', label: 'Avvik', href: '/jobber?fane=avvik' },
            { id: 'forespor', label: 'Forespørsler', href: '/jobber?fane=forespor' },
          ]}
          aktiv="timeplan"
        >
          <p className="text-body text-fg-muted">Innhold utelatt — kun chrome.</p>
        </SideChromeSkall>
      </div>
    </div>
  );
}
