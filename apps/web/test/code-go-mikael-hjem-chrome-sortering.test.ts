import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PHONE_PROFIL_RAD, PHONE_PROFIL_VILKAR } from '../app/(app)/_shell/phone-chrome.ts';
import { analyserMockStats } from '../app/(app)/_shell/phone-home-pulse.ts';
import { SIGNIN_TITTEL, SIGNIN_TOTP_TITTEL } from '../app/signin/signin-steg.ts';

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

describe('CODE-GO Mikael 11.09.2026 — login, hjem, chrome, Sortering', () => {
  it('innlogging viser ikke Velkommen tilbake eller Bekreftelse', () => {
    expect(SIGNIN_TITTEL).toBe('');
    expect(SIGNIN_TOTP_TITTEL).toBe('');
    const skjema = utenKommentarer(les('../app/signin/signin-skjema.tsx'));
    const totp = utenKommentarer(les('../app/2fa-oppsett/page.tsx'));
    expect(skjema).not.toMatch(/Velkommen tilbake/);
    expect(skjema).not.toMatch(/Bekreftelse/);
    expect(skjema).not.toMatch(/AUTH_TITTEL/);
    expect(skjema).not.toMatch(/<h1/);
    expect(totp).not.toMatch(/'Bekreftelse'/);
    expect(skjema).toMatch(/data-auth-kode-steg/);
    expect(skjema).toMatch(/signin-totp/);
  });

  it('toppkort: Endringer mot dato, PPF-etikett på 08.00/19.00-linje', () => {
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    const hero = funksjon(kort, 'PulseHeroFlate');
    const sirkel = funksjon(kort, 'PulseDagSirkel');
    const tall = funksjon(kort, 'PulseTall');
    expect(hero.indexOf('data-pulse-hero-topp')).toBeLessThan(
      hero.indexOf('data-pulse-teller-rad'),
    );
    expect(hero.indexOf('data-pulse-ukedag')).toBeLessThan(hero.indexOf('PulseEndringerLenke'));
    expect(hero.indexOf('PulseEndringerLenke')).toBeLessThan(hero.indexOf('data-pulse-teller-rad'));
    expect(hero).toMatch(/items-end/);
    expect(hero).toMatch(/data-pulse-hero-bunn/);
    expect(hero).toMatch(/PulseAvvikForesporBoks/);
    expect(hero.slice(hero.indexOf('data-pulse-hero-bunn'))).not.toMatch(/PulseEndringerLenke/);
    expect(tall).toMatch(/data-pulse-tall-etikett/);
    expect(tall).toMatch(/h-\[16px\]/);
    expect(sirkel).toMatch(/data-pulse-dag-fot/);
    expect(sirkel).toMatch(/h-\[16px\]/);
    expect(kort).toMatch(/ew-modus-plate/);
  });

  it('Analyser er to loddrette bokser: Analyse + fire KPI uten dither', () => {
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    const analyser = funksjon(kort, 'PulseAnalyserKort');
    expect(analyser).toMatch(/data-analyser-tittel/);
    expect(analyser).toMatch(/Analyse/);
    expect(analyser).toMatch(/font-\[300\]/);
    expect(analyser).toMatch(/siste 30 dager/);
    expect(analyser).toMatch(/Se tallene/);
    expect(analyser).toMatch(/data-analyser-se-tallene/);
    expect(analyser).not.toMatch(/RevenueLineChart/);
    expect(analyser).not.toMatch(/DitherGrowthChart/);
    expect(analyser).not.toMatch(/DitherDonutChart/);
    expect(analyser).not.toMatch(/#0066ff/);
    expect(analyser).toMatch(/flex-col/);
    expect(analyser).toMatch(/data-analyser-kpi/);
    expect(analyser).toMatch(/TrendingUp/);
    expect(analyser).toMatch(/TrendingDown/);
    expect(analyser).toMatch(/text-success/);
    expect(analyser).toMatch(/text-danger/);
    const stats = analyserMockStats(new Date('2026-09-08T10:00:00Z'));
    expect(stats.map((s) => s.label)).toEqual([
      'Besøk på nettsiden',
      'Jobber',
      'Bookinger',
      'Retur',
    ]);
    expect(stats.some((s) => s.opp)).toBe(true);
    expect(stats.some((s) => !s.opp)).toBe(true);
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    expect(hjem.lastIndexOf('PulseAnalyserKort')).toBeLessThan(hjem.lastIndexOf('PulseJobbFlis'));
    expect(hjem).toMatch(/gap-2\.5/);
  });

  it('telefon-chrome beholder logo-bar; tittel + verktøy under', () => {
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    expect(shell).toMatch(/data-shell-logo/);
    expect(shell).toMatch(/data-phone-search/);
    expect(shell).toMatch(/data-phone-side-tittel/);
    expect(shell).toMatch(/InboxTopBar2/);
    expect(shell).not.toMatch(/data-shell-tilbake/);
    expect(shell).not.toMatch(/TilbakePil/);
    expect(shell).toMatch(/sideChrome\.tittel/);
  });

  it('Innboks: Alle meldinger + Ny melding, Sortering før Slett', () => {
    const bar = utenKommentarer(les('../app/(app)/innboks/_top-bar2.tsx'));
    expect(bar).toMatch(/Alle meldinger/);
    expect(bar).toMatch(/data-innboks-alle/);
    expect(bar).toMatch(/Ny melding/);
    expect(bar).toMatch(/data-innboks-sortering/);
    expect(bar).toMatch(/SorteringArk/);
    expect(bar).toMatch(/tittel="Tid"/);
    expect(bar).toMatch(/tittel="Gruppe"/);
    expect(bar).toMatch(/data-innboks-slett/);
    expect(bar).not.toMatch(/data-innboks-tid/);
    expect(bar).not.toMatch(/data-innboks-gruppe/);
    expect(bar.indexOf('Alle meldinger')).toBeLessThan(bar.indexOf('Ny melding'));
    expect(bar.indexOf('data-innboks-sortering')).toBeLessThan(bar.indexOf('data-innboks-slett'));
    expect(les('../app/(app)/_shell/inbox-filter.tsx')).toMatch(/useState<InboxPart>\('alle'\)/);
  });

  it('Tjenester og Kunder bruker ett Sortering-ark', () => {
    const tj = utenKommentarer(les('../app/(app)/innstillinger/tjenestekatalog/_flate.tsx'));
    const tjFelles = utenKommentarer(les('../app/(app)/innstillinger/tjenestekatalog/_felles.ts'));
    expect(tj).toMatch(/data-tjenester-sortering/);
    expect(tj).toMatch(/SorteringArk/);
    expect(tj).toMatch(/TYPE_VALG/);
    expect(tjFelles).toMatch(/Båt/);
    expect(tjFelles).toMatch(/ATV/);
    expect(tj).not.toMatch(/role="tablist"/);
    const ku = utenKommentarer(les('../app/(app)/kunder/page.tsx'));
    expect(ku).toMatch(/data-kunder-sortering/);
    expect(ku).toMatch(/SorteringArk/);
    expect(ku).toMatch(/Nyeste/);
    expect(ku).toMatch(/Eldste/);
    expect(ku).toMatch(/Endwise/);
    expect(ku).not.toMatch(/role="tablist"/);
    expect(ku).not.toMatch(/function Knapperad/);
  });

  it('popup-rader er Innstillinger-brødtekst, ikke 17/700', () => {
    expect(PHONE_PROFIL_RAD).toMatch(/text-body/);
    expect(PHONE_PROFIL_RAD).toMatch(/font-\[450\]/);
    expect(PHONE_PROFIL_RAD).not.toMatch(/font-\[700\]/);
    expect(PHONE_PROFIL_VILKAR).toMatch(/text-body/);
    const ark = utenKommentarer(les('../app/(app)/_shell/sortering-ark.tsx'));
    expect(ark).toMatch(/data-sortering-tittel/);
    expect(ark).toMatch(/Sortering/);
    expect(ark).toMatch(/text-body/);
    expect(ark).not.toMatch(/font-\[700\]/);
    expect(ark).toMatch(/shadow-none/);
  });
});
