'use client';

import { FilterChips, ListeRad, Seksjon, Side, StatusChip } from '@endwise/ui';
import { useState } from 'react';

const SIDER = [
  'hjem',
  'innboks',
  'samtale',
  'kunder',
  'kunde',
  'timeplan',
  'ny-jobb',
  'lager',
  'butikk',
  'organisasjon',
] as const;

/**
 * Offentlig mobil-preview uten innlogging. Brukes av Playwright @ 390px.
 * Ikke en produkt-rute.
 */
export default function VisuellMobil() {
  const [chip, setChip] = useState<'alle' | 'kunder' | 'intern'>('alle');

  return (
    <div className="min-h-dvh bg-bg text-fg" data-visuell-mobil>
      <div className="mx-auto flex w-[390px] max-w-full flex-col gap-10 py-6">
        <header className="px-4">
          <p className="text-[13px] text-fg-muted">PR #184 · 390px</p>
          <h1 className="text-[24px] font-[650] leading-[1.2] text-fg">Mobilflater</h1>
        </header>

        <section data-mobil-side="hjem" className="border-border border-t pt-6">
          <Side tittel="Verkstedet" undertekst="Tirsdag 2. nov">
            <div data-kort className="ew-kort flex flex-col gap-3">
              <p className="text-[18px] font-[650]">I dag</p>
              <p className="text-[13px] text-fg-muted">3 planlagt · 1 pågår · 2 ferdig</p>
              <StatusChip status="pagar" />
            </div>
            <ListeRad tittel="Les alle siste meldinger" undertekst="2 uleste" hoyre="2" />
            <ListeRad tittel="3 deler under minimum" undertekst="Lager" />
          </Side>
        </section>

        <section data-mobil-side="innboks" className="border-border border-t pt-6">
          <Side tittel="Innboks" undertekst="Alle meldinger">
            <FilterChips
              ariaLabel="Filter"
              chips={[
                { key: 'alle', label: 'Alle' },
                { key: 'kunder', label: 'Kunder' },
                { key: 'intern', label: 'Intern' },
              ]}
              valgt={chip}
              onChange={setChip}
            />
            <ListeRad tittel="Kari Nordmann" undertekst="Rekker dere bremsene?" hoyre="10:12" />
            <ListeRad tittel="Ole Mekaniker" undertekst="Delen er på vei" hoyre="i går" />
          </Side>
        </section>

        <section data-mobil-side="samtale" className="border-border border-t pt-6">
          <Side
            tittel="Kari Nordmann"
            handling={
              <span className="inline-flex h-10 items-center rounded-pill border border-fg bg-bg px-4 text-[13px] font-[650]">
                Detaljer
              </span>
            }
          >
            <div className="flex flex-col gap-3">
              <p className="max-w-[80%] rounded-[20px] border border-border bg-[#f3f3f3] px-3 py-2 text-body">
                Rekker dere bremsene før helgen?
              </p>
              <p className="ml-auto max-w-[80%] rounded-[20px] bg-surface-2 px-3 py-2 text-body">
                Ja, vi har tid torsdag.
              </p>
            </div>
          </Side>
        </section>

        <section data-mobil-side="kunder" className="border-border border-t pt-6">
          <Side tittel="Kunder" undertekst="12 kunder">
            <ListeRad tittel="Kari Nordmann" undertekst="2 kjøretøy" initialer="KN" />
            <ListeRad tittel="Per Hansen" undertekst="1 kjøretøy" initialer="PH" />
          </Side>
        </section>

        <section data-mobil-side="kunde" className="border-border border-t pt-6">
          <Side tittel="Kari Nordmann" undertekst="Kunde siden 2024">
            <Seksjon tittel="Kjøretøy" antall={1}>
              <ListeRad tittel="EK12345" undertekst="Yamaha MT-07" />
            </Seksjon>
            <Seksjon tittel="Jobber" antall={1}>
              <ListeRad
                tittel="EU-kontroll"
                undertekst="Torsdag 10:00"
                hoyre={<StatusChip status="planlagt" />}
              />
            </Seksjon>
          </Side>
        </section>

        <section data-mobil-side="timeplan" className="border-border border-t pt-6">
          <Side tittel="Timeplan" undertekst="Tirsdag">
            <ListeRad
              tittel="10:00 EU-kontroll"
              undertekst="Kari · Ole"
              hoyre={<StatusChip status="planlagt" />}
            />
            <ListeRad
              tittel="13:00 Service"
              undertekst="Per · Mia"
              hoyre={<StatusChip status="pagar" />}
            />
          </Side>
        </section>

        <section data-mobil-side="ny-jobb" className="border-border border-t pt-6">
          <Side tittel="Ny jobb" undertekst="Mot ledig slot">
            <Seksjon tittel="Kunde og kjøretøy">
              <div data-kort className="ew-kort text-[16px] text-fg-muted">
                Felt: kunde, regnr, tjeneste, tid
              </div>
            </Seksjon>
          </Side>
        </section>

        <section data-mobil-side="lager" className="border-border border-t pt-6">
          <Side tittel="Lager" undertekst="48 deler">
            <ListeRad tittel="På lager" hoyre="120" chevron={false} />
            <ListeRad tittel="Tilgjengelig" hoyre="98" chevron={false} />
            <ListeRad tittel="Under minimum" hoyre="3" />
          </Side>
        </section>

        <section data-mobil-side="butikk" className="border-border border-t pt-6">
          <Side tittel="Butikk" undertekst="4 varer · 0 kjøretøy">
            <ListeRad tittel="Bremsekloss foran" undertekst="BR-221" hoyre="429,00 kr" />
            <ListeRad tittel="Olje 10W-40" undertekst="OL-10" hoyre="189,00 kr" />
          </Side>
        </section>

        <section data-mobil-side="organisasjon" className="border-border border-t pt-6">
          <Side tittel="Organisasjon" undertekst="Firmaopplysninger">
            <ListeRad tittel="Firmanavn" undertekst="Tohjul AS" chevron={false} />
            <ListeRad tittel="Antall ansatte" undertekst="8" chevron={false} />
          </Side>
        </section>

        <p className="px-4 text-[13px] text-fg-muted">{SIDER.length} flater</p>
      </div>
    </div>
  );
}
