'use client';

import { ArrowUpRight, Car } from '@endwise/ui';
import { InnstillingRad, InnstillingSeksjon } from '../(app)/_shell/innstilling-gruppe';
import { PhoneSokFelt } from '../(app)/_shell/phone-sok-felt';
import { SideChromeSkall } from '../(app)/_shell/side-chrome-skall';

/**
 * Uinnlogget visuell GO for skjema/chrome (Kunder-søk, Opprett jobb, Tjenester).
 * Ikke en produkt-rute.
 */
export default function VisualFormsPreview() {
  return (
    <div className="min-h-dvh bg-bg text-fg" data-visual-forms-preview="go">
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-10 px-3 py-5">
        <p className="text-title text-fg">Skjema / chrome preview</p>

        <SideChromeSkall
          tittel="Kunder"
          ingress="Søk matcher top-bar-feltet."
          faner={[
            { id: 'alle', label: 'Alle kunder', href: '/kunder' },
            { id: 'opprett', label: 'Opprett kunde', href: '/kunder?ny=1' },
          ]}
          aktiv="alle"
        >
          <div className="min-w-[260px] flex-1" data-kunder-sok>
            <PhoneSokFelt
              defaultValue=""
              placeholder="Søk på navn, e-post eller telefon"
              aria-label="Søk i kunder"
              readOnly
            />
          </div>
        </SideChromeSkall>

        <SideChromeSkall
          tittel="Timeplan"
          ingress="Ny jobb mot ledig slot."
          faner={[
            { id: 'timeplan', label: 'Timeplan', href: '/jobber' },
            { id: 'opprett', label: 'Opprett jobb', href: '/bookinger/ny' },
          ]}
          aktiv="opprett"
        >
          <InnstillingSeksjon
            tittel="Kjøretøy"
            ingress="Regnr følger jobben. Vegvesen fyller merke/modell."
          >
            <InnstillingRad
              label="Registreringsnummer"
              hint="Følger jobben. Vegvesen fyller merke/modell."
              siste
            >
              <div className="flex items-end gap-2" data-opprett-jobb-kjoretoy>
                <div className="relative min-w-0 flex-1">
                  <Car
                    size={16}
                    strokeWidth={1.75}
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-muted"
                    aria-hidden
                  />
                  <input
                    readOnly
                    defaultValue="EL12345"
                    className="h-control w-full ew-felt ew-felt-md pl-9 pr-3"
                    aria-label="Registreringsnummer"
                  />
                </div>
              </div>
              <p className="mt-2 text-[13px] text-fg-muted">Yamaha MT-07 (2022)</p>
            </InnstillingRad>
          </InnstillingSeksjon>
        </SideChromeSkall>

        <SideChromeSkall
          tittel="Tjenester"
          ingress="Opprettelse bare i top-bar."
          faner={[
            { id: 'alle', label: 'Alle tjenester', href: '/prisliste' },
            { id: 'opprett', label: 'Opprett tjenester', href: '/prisliste?fane=opprett' },
          ]}
          aktiv="alle"
        >
          <div data-tjenester-alle className="flex flex-col gap-3">
            <p className="text-label text-fg">Ingen ekstra opprett-knapp på Alle-flaten.</p>
            <p className="text-[13px] text-fg-muted">
              Opprettelse åpnes bare fra <span className="text-fg">Opprett tjenester</span> i
              top-bar.
            </p>
            <span className="inline-flex items-center gap-1 text-label font-normal text-fg">
              Opprett tjenester
              <ArrowUpRight size={16} strokeWidth={1.75} className="text-fg-muted" aria-hidden />
            </span>
          </div>
        </SideChromeSkall>
      </div>
    </div>
  );
}
