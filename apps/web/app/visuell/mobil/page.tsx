'use client';

import {
  AgentThinking,
  DateCalendar,
  DatePicker,
  Drawer,
  DrawerBody,
  DrawerHeader,
  FeltInput,
  FeltKode,
  FilterChips,
  Inbox,
  ListeRad,
  Package,
  Seksjon,
  Side,
  StatusChip,
  Users,
} from '@endwise/ui';
import { parseDate } from '@internationalized/date';
import { useMemo, useState } from 'react';
import { osloVeggklokke } from '../../(app)/_lib/oslo-dag';
import { pulsdagOverskrift, tallKortStats } from '../../(app)/_shell/phone-home-pulse';
import {
  PulseAnalyserKort,
  PulseHeroFlate,
  PulseJobbFlis,
  PulseRadKort,
} from '../../(app)/_shell/pulse-kort';
import { RonnySirkelKnapp } from '../../(app)/_workshop/ronny-sirkel';

const SIDER = [
  'hjem',
  'innboks',
  'samtale',
  'kunder',
  'kunde',
  'timeplan',
  'timeplan-ansatte',
  'ny-jobb',
  'lager',
  'butikk',
  'organisasjon',
  'skuff',
  'dato',
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
          <VisuellHjemPulse />
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
            <div className="relative flex">
              <div className="min-w-0 flex-1">
                <h3 className="sticky top-0 bg-bg px-4 py-1.5 text-[13px] font-[650] text-fg-muted">
                  H
                </h3>
                <ListeRad tittel="Per Hansen" undertekst="1 kjøretøy" initialer="PH" />
                <h3 className="sticky top-0 bg-bg px-4 py-1.5 text-[13px] font-[650] text-fg-muted">
                  N
                </h3>
                <ListeRad tittel="Kari Nordmann" undertekst="2 kjøretøy" initialer="KN" />
              </div>
              <nav
                data-kunder-alfa-rail
                aria-label="Alfabet"
                className="flex w-[22px] shrink-0 flex-col items-center text-[13px] text-fg-muted"
              >
                {['#', 'A', 'H', 'N', 'Å'].map((b) => (
                  <span key={b}>{b}</span>
                ))}
              </nav>
            </div>
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

        <section data-mobil-side="timeplan-ansatte" className="border-border border-t pt-6">
          <Side tittel="Timeplan ansatte" undertekst="Uke">
            <ListeRad tittel="Ole Mekaniker" undertekst="Ledig · ingen stempling" initialer="OM" />
            <ListeRad tittel="Mia Service" undertekst="Fri" initialer="MS" />
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
            <ListeRad tittel="Reservert" hoyre="22" chevron={false} />
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
          <Side tittel="Organisasjon" undertekst="Verkstedets oppsett">
            <ListeRad tittel="Ansatte" undertekst="Teamet, timeplan og hvem som har jobber i dag" />
            <ListeRad tittel="Timeplan ansatte" undertekst="Uke og måned, syk og ferie" />
            <ListeRad tittel="Mekanikere" undertekst="Kompetanse og kapasitet" />
            <ListeRad tittel="Tilganger" undertekst="Hvem som får se hva" />
            <ListeRad tittel="Abonnement" undertekst="Plan, tillegg og priser" />
          </Side>
        </section>

        <section data-mobil-side="innlogging" className="border-border border-t pt-6">
          <VisuellInnlogging />
        </section>

        <section data-mobil-side="ronny" className="border-border border-t pt-6">
          <VisuellRonny />
        </section>

        <section data-mobil-side="skuff" className="border-border border-t pt-6">
          <VisuellSkuff />
        </section>

        <section data-mobil-side="dato" className="border-border border-t pt-6">
          <VisuellDato />
        </section>

        <p className="px-4 text-[13px] text-fg-muted">{SIDER.length} flater</p>
      </div>
    </div>
  );
}

function VisuellHjemPulse() {
  const analyser = useMemo(
    () =>
      tallKortStats(
        [
          { id: '1', status: 'confirmed', startsAt: '2026-09-01T08:00:00' },
          { id: '2', status: 'completed', startsAt: '2026-08-20T08:00:00' },
          { id: '3', status: 'cancelled', startsAt: '2026-09-02T08:00:00' },
        ],
        new Date('2026-09-08T10:00:00'),
      ),
    [],
  );
  const dag = useMemo(() => pulsdagOverskrift(new Date('2026-09-08T10:00:00')), []);
  const sirkelNaa = useMemo(() => osloVeggklokke('2026-09-08', 13, 30), []);
  return (
    <Side tittel="Verkstedet" undertekst={`${dag.ukedag} ${dag.dato}`}>
      <div data-visuell-hjem-pulse className="flex flex-col gap-2.5 px-3">
        <PulseHeroFlate
          href="#idag"
          ukedag={dag.ukedag}
          dato={dag.dato}
          planlagt={3}
          paagaar={2}
          ferdig={1}
          lasterJobber={false}
          avvik={2}
          forespor={0}
          sirkelNaa={sirkelNaa}
        />
        <PulseRadKort href="#innboks" ikon={Inbox} tittel="Les alle siste meldinger" teller={7} />
        <PulseRadKort href="#lager" ikon={Package} tittel="Venter på bestilling" teller={3} />
        <PulseAnalyserKort stats={analyser} href="#statistikk" forhandlerNavn="Nordvik MC" />
        <div data-pulse-bunn className="flex w-full gap-3">
          <div className="min-w-0 flex-1 basis-0">
            <PulseRadKort href="#team" ikon={Users} tittel="På jobb" teller="2 / 4" kompakt />
          </div>
          <div className="min-w-0 flex-1 basis-0">
            <PulseJobbFlis />
          </div>
        </div>
      </div>
    </Side>
  );
}

function VisuellInnlogging() {
  return (
    <Side tittel="Innlogging" undertekst="Nesten der · OTP · felt">
      <div data-visuell-innlogging className="flex flex-col gap-4 px-4">
        <p className="text-center text-title font-[650] text-fg">Nesten der</p>
        <FeltInput
          id="visuell-epost"
          storrelse="lg"
          type="email"
          label="E-post"
          value="admin-a@verksted.test"
          onChange={() => undefined}
        />
        <p className="text-label text-fg-muted">Fyll inn kode</p>
        <FeltKode aria-label="Fyll inn kode" length={5} value="" onChange={() => undefined} />
      </div>
    </Side>
  );
}

function VisuellRonny() {
  const [apen, setApen] = useState(false);
  return (
    <Side tittel="Ronny" undertekst="Sticky sirkel + bunn-Drawer">
      <div className="flex flex-col items-start gap-3 px-4">
        <RonnySirkelKnapp
          onClick={() => setApen(true)}
          className="relative top-auto left-auto z-0 flex size-16 items-center justify-center rounded-full bg-[#c45c26] text-bg shadow-none"
        />
        <p className="text-[13px] text-fg-muted">Uten spinning. Overskrift bare «Ronny».</p>
      </div>
      <Drawer placement="bottom" isOpen={apen} onOpenChange={setApen} aria-label="Ronny">
        <DrawerHeader title="Ronny" />
        <DrawerBody className="px-3 pb-6">
          <div data-ronny-tenker>
            <AgentThinking label="Ronny tenker…" variant="wave" tone="primary" />
          </div>
        </DrawerBody>
      </Drawer>
    </Side>
  );
}

function VisuellSkuff() {
  const [apen, setApen] = useState(false);
  return (
    <Side tittel="Ny kunde" undertekst="Bunn-Drawer">
      <button
        type="button"
        data-visuell-skuff-apne
        data-skuff-apen={apen ? '1' : '0'}
        onClick={() => setApen(true)}
        className="inline-flex h-10 items-center rounded-pill border border-fg bg-bg px-4 text-[13px] font-[650]"
      >
        Ny kunde
      </button>
      <Drawer placement="bottom" isOpen={apen} onOpenChange={setApen} aria-label="Ny kunde">
        <DrawerHeader title="Ny kunde" />
        <DrawerBody className="px-3 pb-6">
          <p className="text-[16px] text-fg">Navn</p>
          <p className="mt-1 text-[13px] text-fg-muted">Kari Nordmann</p>
        </DrawerBody>
      </Drawer>
    </Side>
  );
}

function VisuellDato() {
  const [dato, setDato] = useState(() => parseDate('2026-11-02'));
  return (
    <Side tittel="Velg dato" undertekst="Board DatePicker">
      <div data-visuell-dato className="flex flex-col gap-3">
        <DatePicker aria-label="Dato" value={dato} onChange={(d) => d && setDato(d)} />
        <DateCalendar aria-label="Kalender" value={dato} onChange={(d) => d && setDato(d)} />
      </div>
    </Side>
  );
}
