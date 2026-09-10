import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DEALER_PULSE_KEYS } from '../app/(app)/_shell/phone-home.ts';
import { fmtPulseTime } from '../app/(app)/_shell/phone-home-pulse.ts';
import { velgKjoretoyForJobb } from '../app/(app)/bookinger/_knytt-kjoretoy.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

function funksjon(kilde: string, navn: string) {
  const start = kilde.indexOf(`export function ${navn}`);
  expect(start).toBeGreaterThan(-1);
  const neste = kilde.slice(start + 1).search(/\nexport function |\nexport const /);
  return neste === -1 ? kilde.slice(start) : kilde.slice(start, start + 1 + neste);
}

describe('CODE-GO Mikael — visual + forms polish', () => {
  it('toppkort: text-label dag, 08.00/19.00, ink-dither, Modus-Avvik, Endringer-lenke', () => {
    expect(fmtPulseTime(8)).toBe('08.00');
    expect(fmtPulseTime(19)).toBe('19.00');
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    const hero = funksjon(kort, 'PulseHeroFlate');
    const sirkel = funksjon(kort, 'PulseDagSirkel');
    const endringer = funksjon(kort, 'PulseEndringerLenke');
    const avvik = funksjon(kort, 'PulseAvvikForesporBoks');
    expect(hero.indexOf('data-pulse-ukedag')).toBeLessThan(hero.indexOf('data-pulse-teller-rad'));
    expect(hero).toMatch(/text-label font-normal/);
    expect(sirkel).toMatch(/PULSE_DAG_FYLL_INK/);
    expect(sirkel).toMatch(/PULSE_DAG_FYLL_HAIRLINE/);
    expect(sirkel).not.toMatch(/#0066ff/);
    expect(sirkel).not.toMatch(/data-pulse-dag-naa/);
    expect(endringer).toMatch(/ArrowUpRight/);
    expect(endringer).toMatch(/text-label font-normal/);
    expect(endringer).not.toMatch(/font-\[650\]/);
    expect(endringer).not.toMatch(/ChevronRight/);
    expect(avvik).toMatch(/ew-modus-plate/);
    expect(avvik).toMatch(/p-0\.5/);
    expect(avvik).toMatch(/h-7/);
    expect(kort).not.toMatch(/#0066ff/);
  });

  it('Analyser er 50/50 over Jobb med forhandlernavn og Alle tall-lenke', () => {
    expect([...DEALER_PULSE_KEYS]).toEqual([
      'idag',
      'innboks',
      'lager',
      'analyser',
      'team',
      'jobb',
    ]);
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    expect(hjem.lastIndexOf('PulseAnalyserKort')).toBeLessThan(hjem.lastIndexOf('PulseJobbFlis'));
    expect(hjem).toMatch(/forhandlerNavn=\{tenantName\}/);
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    const analyser = funksjon(kort, 'PulseAnalyserKort');
    expect(analyser).toMatch(/flex-1 basis-0/);
    expect(analyser).toMatch(/Tall for/);
    expect(analyser).toMatch(/Alle tall/);
    expect(analyser).toMatch(/data-analyser-alle-tall/);
    expect(analyser).toMatch(/ArrowUpRight/);
    expect(analyser).toMatch(/data-analyser-vekst/);
    expect(analyser).not.toMatch(/Se tall/);
    expect(analyser).not.toMatch(/>Analyser</);
  });

  it('Innboks: Settings-rader, profil-popup, Ny melding med Send', () => {
    const side = utenKommentarer(les('../app/(app)/innboks/_inbox-sidebar.tsx'));
    expect(side).toMatch(/data-innboks-rad/);
    expect(side).toMatch(/border-border border-b/);
    expect(side).not.toMatch(/rounded-control border px-3 py-2\.5/);
    const popup = utenKommentarer(les('../app/(app)/innboks/_popup.tsx'));
    expect(popup).toMatch(/data-innboks-popup-scrim/);
    expect(popup).toMatch(/fixed inset-0 z-\[70\]/);
    expect(popup).toMatch(/PHONE_PROFIL_RAD/);
    const samtale = utenKommentarer(les('../app/(app)/innboks/_ny-samtale.tsx'));
    expect(samtale).toMatch(/data-ny-melding-send/);
    expect(samtale).toMatch(/Send\s*<\/StatefulButton>/);
    expect(samtale).toMatch(/InnstillingSeksjon/);
    expect(samtale).toMatch(/data-ny-samtale-knapperad/);
  });

  it('skjemaer bruker Innstillinger-inndeling; jobb fester kjøretøy; tjenester uten dup-knapp', () => {
    expect(les('../app/(app)/kunder/_ny-kunde.tsx')).toMatch(/InnstillingSeksjon/);
    expect(les('../app/(app)/kunder/_registrer-kjoretoy.tsx')).toMatch(/InnstillingSeksjon/);
    expect(les('../app/(app)/innstillinger/tjenestekatalog/_ny-tjeneste.tsx')).toMatch(
      /InnstillingSeksjon/,
    );
    const jobb = utenKommentarer(les('../app/(app)/bookinger/ny/page.tsx'));
    expect(jobb).toMatch(/velgKjoretoyForJobb/);
    expect(jobb).toMatch(/data-opprett-jobb-kjoretoy/);
    expect(jobb).toMatch(/vehicles\.create/);
    expect(jobb).toMatch(/vehicleId: festetId/);
    expect(les('../app/(app)/prisliste/page.tsx')).toMatch(/skjulNy/);
    expect(les('../app/(app)/prisliste/page.tsx')).not.toMatch(/skjulNy=\{aktiv/);
    expect(les('../app/(app)/kunder/page.tsx')).toMatch(/PhoneSokFelt/);
    expect(les('../app/(app)/kunder/page.tsx')).toMatch(/data-kunder-sok/);
  });

  it('velgKjoretoyForJobb gjenbruker regnr eller ber om opprett', () => {
    expect(
      velgKjoretoyForJobb({
        vehicleId: 'abc',
        regNumber: 'EK1',
        kjoretoy: [],
      }),
    ).toEqual({ vehicleId: 'abc', maaOpprette: false, regNumber: 'EK1' });
    expect(
      velgKjoretoyForJobb({
        vehicleId: '',
        regNumber: 'ek12345',
        kjoretoy: [{ id: 'v1', regNumber: 'EK12345' }],
      }),
    ).toEqual({ vehicleId: 'v1', maaOpprette: false, regNumber: 'EK12345' });
    expect(
      velgKjoretoyForJobb({
        vehicleId: '',
        regNumber: 'NY999',
        kjoretoy: [],
      }),
    ).toEqual({ maaOpprette: true, regNumber: 'NY999' });
  });
});
