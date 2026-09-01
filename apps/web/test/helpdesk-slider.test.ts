import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  erTestHelpdeskTittel,
  HELPDESK_SLIDER_MINIMER_KEY,
  harNyUlestArtikkel,
  lesLagretMinimer,
  sliderStartMinimer,
} from '../app/(app)/_shell/helpdesk-slider.ts';

/**
 * Helpdesk-slideren (TipCard) kan minimeres. Visningsvelgeren kan ikke.
 * Ny-badge tvinger åpen ved lasting. Bruker kan likevel lukke. Ny ulest
 * artikkel (ny id, eller ulest none→some) åpner igjen. localStorage overlever
 * refresh, men aldri når lista har ulest.
 */
const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

const a = (id: string, ulest: boolean) => ({ id, ulest });

describe('helpdesk-slider: Ny tvinger åpen, persist kun uten ulest', () => {
  it('nøkkelen er slideren, ikke visningsvelgeren', () => {
    expect(HELPDESK_SLIDER_MINIMER_KEY).toBe('endwise.helpdesk-slider.minimer');
    expect(HELPDESK_SLIDER_MINIMER_KEY).not.toMatch(/visningsvelger/);
  });

  it('leser collapsed fra localStorage-verdien 1, ulagret er null', () => {
    expect(lesLagretMinimer('1')).toBe(true);
    expect(lesLagretMinimer('0')).toBe(false);
    expect(lesLagretMinimer(null)).toBe(null);
  });

  it('Ny sak = fullt åpen ved lasting, selv om localStorage sier minimert', () => {
    expect(sliderStartMinimer(true, true)).toBe(false);
    expect(sliderStartMinimer(false, true)).toBe(false);
    expect(sliderStartMinimer(null, true, true)).toBe(false);
  });

  it('uten ulest respekteres lagret minimert/åpen', () => {
    expect(sliderStartMinimer(true, false)).toBe(true);
    expect(sliderStartMinimer(false, false)).toBe(false);
  });

  it('tom liste uten lagret valg starter minimert — chrome, ikke slettet', () => {
    expect(sliderStartMinimer(null, false, true)).toBe(true);
    expect(sliderStartMinimer(false, false, true)).toBe(false);
    expect(sliderStartMinimer(null, false, false)).toBe(false);
  });

  it('ny ulest id tvinger åpen (live/SSE eller query-oppdatering)', () => {
    const forrige = [a('gammel', false)];
    const neste = [a('ny', true), a('gammel', false)];
    expect(harNyUlestArtikkel(forrige, neste)).toBe(true);
  });

  it('ulest none→some tvinger åpen også uten ny id', () => {
    const samme = [a('a1', false)];
    expect(harNyUlestArtikkel(samme, [a('a1', true)])).toBe(true);
  });

  it('samme uleste liste etter at brukeren minimerte tvinger ikke åpen igjen', () => {
    const lista = [a('a1', true), a('a2', false)];
    expect(harNyUlestArtikkel(lista, lista)).toBe(false);
    expect(harNyUlestArtikkel(lista, [a('a1', true), a('a2', false)])).toBe(false);
  });

  it('første snapshot er lasting — ikke «ny sak midt i økten»', () => {
    expect(harNyUlestArtikkel(null, [a('a1', true)])).toBe(false);
  });
});

describe('test-artikler skjules i forhandler-UI', () => {
  it('kjenner igjen Mikael testing og Halla balla', () => {
    expect(erTestHelpdeskTittel('Mikael testing')).toBe(true);
    expect(erTestHelpdeskTittel('Halla balla!')).toBe(true);
    expect(erTestHelpdeskTittel('Slik oppretter du en jobb')).toBe(false);
  });
});

describe('TipCard er ute av sidebaren — OppgraderPille sitter der', () => {
  const sidebar = utenKommentarer(les('../app/(app)/_shell/sidebar.tsx'));
  const pille = utenKommentarer(les('../app/(app)/_shell/oppgrader-pille.tsx'));

  it('sidebar monterer Grainient-oppgraderingspille, ikke Hjelp-TipCard', () => {
    expect(sidebar).toMatch(/OppgraderPille/);
    expect(sidebar).not.toMatch(/<TipCard/);
    expect(pille).toMatch(/Grainient/);
    expect(pille).toMatch(/oppgraderKnappetekst/);
    expect(pille).toMatch(/organisasjon\?seksjon=abonnement/);
    expect(pille).not.toMatch(/ShaderGradient/);
  });
});

describe('visningsvelgeren er ikke minimer-kontrollen', () => {
  it('har verken X-pille eller visningsvelger-localStorage', () => {
    const switcher = utenKommentarer(les('../app/(app)/_shell/context-switcher.tsx'));
    expect(switcher).not.toMatch(/endwise\.visningsvelger\.minimer/);
    expect(switcher).not.toMatch(/Minimer visningsvelger/);
    expect(switcher).not.toMatch(/Utvid visningsvelger/);
    expect(switcher).toMatch(/ChevronDown/);
    expect(switcher).toMatch(/headerNavn/);
  });
});
