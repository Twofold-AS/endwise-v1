import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  BUTIKK_SALG_KANALER,
  butikkSalgStatus,
  butikkSalgStatusLabel,
  grupperVarerEtterKategori,
  vareKategoriNokkel,
} from '../app/(app)/_innbygging/butikk-hub.ts';
import {
  INNBOKS_SIDE_STORRELSE,
  innboksAngreTekst,
  innboksPagerTekst,
  innboksTrefferSok,
} from '../app/(app)/_innbygging/innboks-katalog.ts';
import { merkerFor, modellerFor } from '../app/(app)/_innbygging/kjoretoy-katalog.ts';
import { lesLagerBestilt, lesLagerMin } from '../app/(app)/_innbygging/lager-katalog.ts';
import { parkParent } from '../app/(app)/_innbygging/parent-form.ts';
import {
  analyserFraBookinger,
  idagVisning,
  innboksRad,
} from '../app/(app)/_shell/phone-home-pulse.ts';
import { timeplanUkeFra } from '../app/(app)/_shell/timeplan-dager.ts';
import { timeplanManedRutenett } from '../app/(app)/_shell/timeplan-maned-rutenett.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('Claude katalog 22.09 — hjem / innboks / timeplan / jobSlots', () => {
  it('tom I dag og innboks er 0, 30d analyse merker visninger uten API', () => {
    const naa = new Date('2026-09-22T10:00:00');
    expect(idagVisning([], naa)).toEqual({ planlagt: 0, paagaar: 0, ferdig: 0 });
    expect(innboksRad([])).toEqual({ meldinger: 0 });
    const stats = analyserFraBookinger([], naa);
    expect(stats.find((s) => s.id === 'visninger')?.delta).toBe('Ingen API');
    expect(les('../app/(app)/_shell/phone-home-dealer.tsx')).toMatch(/credits: null/);
  });

  it('innboks: søk, pager 10, angre-tekst', () => {
    expect(INNBOKS_SIDE_STORRELSE).toBe(10);
    expect(
      innboksTrefferSok(
        { id: '1', kind: 'customer', heading: 'Kari', lastMessageAt: '2026-09-22' },
        'kari',
      ),
    ).toBe(true);
    expect(
      innboksTrefferSok(
        { id: '1', kind: 'internal', subject: 'Pause', lastMessageAt: '2026-09-22' },
        'xyz',
      ),
    ).toBe(false);
    expect(innboksPagerTekst(0, 10, 24)).toBe('Viser 1–10 av 24');
    expect(innboksPagerTekst(0, 0, 0)).toBe('Viser 0–0 av 0');
    expect(innboksAngreTekst(1)).toBe('1 samtale er slettet');
    expect(innboksAngreTekst(3)).toBe('3 samtaler er slettet');
    expect(les('../app/(app)/innboks/_inbox-sidebar.tsx')).toMatch(
      /innboksTrefferSok|innboksPagerTekst/,
    );
    expect(les('../app/(app)/innboks/_top-bar2.tsx')).toMatch(/AngreToast|innboksAngreTekst/);
  });

  it('samtale: deltakere, last, fjern ærlig', () => {
    expect(les('../app/(app)/innboks/[id]/page.tsx')).toMatch(/data-samtale-deltakere/);
    expect(les('../app/(app)/innboks/[id]/page.tsx')).toMatch(/data-samtale-last/);
    expect(les('../app/(app)/_innbygging/deltaker-ark.tsx')).toMatch(/Fjern/);
  });

  it('timeplan: uke fra mandag + månedsgitter', () => {
    const uke = timeplanUkeFra('2026-09-22');
    expect(uke).toHaveLength(7);
    expect(uke[0]?.ymd).toBe('2026-09-21');
    expect(uke[6]?.ymd).toBe('2026-09-27');
    const celler = timeplanManedRutenett('2026-09-22');
    expect(celler.filter((c) => !c.utenfor)).toHaveLength(30);
    expect(les('../app/(app)/saker/page.tsx')).toMatch(/TimeplanDagListe/);
    expect(les('../app/(app)/jobber/_alle-endringer.tsx')).toMatch(/settleChange/);
  });

  it('Ny jobb steg 3 kaller jobSlots', () => {
    expect(les('../app/(app)/bookinger/ny/page.tsx')).toMatch(/JobSlotsVelger/);
    expect(les('../app/(app)/bookinger/_job-slots-velger.tsx')).toMatch(/bookings\.jobSlots/);
    expect(les('../../../packages/modules/src/booking/job-slots.ts')).toMatch(/JOB_SLOT_WEEKDAY/);
    expect(les('../../../apps/api/src/trpc/routers/bookings.ts')).toMatch(/jobSlots:/);
  });
});

describe('Claude katalog 22.09 — org / lager / butikk / skjema', () => {
  it('Tjenester under Org-oversikt peker på /prisliste, ikke ny chrome-pille', () => {
    expect(les('../app/(app)/organisasjon/forhandleren/_kort.tsx')).toMatch(/\/prisliste/);
    expect(les('../app/(app)/organisasjon/forhandleren/_kort.tsx')).toMatch(/data-org-tjenester/);
    expect(les('../app/(app)/organisasjon/_seksjoner.ts')).not.toMatch(/id: 'tjenester'/);
    expect(les('../app/(app)/organisasjon/_ansatte.tsx')).toMatch(/data-ansatt-vaktplan/);
    expect(les('../app/(app)/innstillinger/tjenestekatalog/_tjeneste-kort.tsx')).toMatch(
      /data-tjeneste-sertifikat/,
    );
  });

  it('lager bestilt/min er økt-lokalt; butikk grupperer kategori; salgskanal ærlig', () => {
    expect(lesLagerBestilt()).toEqual([]);
    expect(lesLagerMin()).toEqual({});
    expect(les('../app/(app)/lager/deler/page.tsx')).toMatch(/lagreLagerBestilt/);
    expect(
      grupperVarerEtterKategori([{ category: 'Olje' }, { category: null }, { category: 'Olje' }]),
    ).toEqual([
      { kategori: 'Olje', varer: [{ category: 'Olje' }, { category: 'Olje' }] },
      { kategori: 'Uten kategori', varer: [{ category: null }] },
    ]);
    expect(vareKategoriNokkel('  Filter  ')).toBe('Filter');
    expect([...BUTIKK_SALG_KANALER]).toEqual(['Finn.no', 'Butikk', 'Reservert']);
    expect(butikkSalgStatus()).toBe('ikke_registrert');
    expect(butikkSalgStatusLabel()).toBe('Ikke registrert · Ingen kanal');
    expect(les('../app/(app)/butikk/page.tsx')).toMatch(/grupperVarerEtterKategori/);
  });

  it('parentF + kaskade MC/Båt/ATV', () => {
    const ytre = { navn: 'Kari', telefon: '99' };
    const parked = parkParent(ytre);
    expect(parked).toEqual(ytre);
    expect(parked).not.toBe(ytre);
    expect(merkerFor('MC')).toContain('Yamaha');
    expect(modellerFor('MC', 'Yamaha')).toContain('MT-07');
    expect(les('../app/(app)/kunder/_ny-kunde.tsx')).toMatch(/parkParent/);
    expect(les('../app/(app)/kunder/_ny-kunde.tsx')).toMatch(/KjoretoyKaskade/);
    expect(les('../app/(app)/kunder/_ny-kunde.tsx')).toMatch(/data-ny-kunde-parentf/);
  });
});
