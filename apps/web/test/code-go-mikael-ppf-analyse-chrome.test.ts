import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

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

describe('CODE-GO Mikael 11.09.2026 oppfølging — PPF, Analyse, chrome 1+2, Sortering', () => {
  it('PPF-tallenes vertikale senter ligger på halvsirkelens midtlinje; etiketter med 08.00/19.00', () => {
    expect(utenKommentarer(les('../app/(app)/_shell/phone-home-pulse.ts'))).toMatch(
      /PULSE_DAG_BUE_HOYDE = 78/,
    );
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    const hero = funksjon(kort, 'PulseHeroFlate');
    const sirkel = funksjon(kort, 'PulseDagSirkel');
    const tall = funksjon(kort, 'PulseTall');
    expect(hero).toMatch(/items-end/);
    expect(tall).toMatch(/data-pulse-tall-siffer/);
    expect(tall).toMatch(/h-\[78px\]/);
    expect(tall).toMatch(/items-center/);
    expect(tall).toMatch(/data-pulse-tall-etikett/);
    expect(tall).toMatch(/h-\[16px\]/);
    expect(sirkel).toMatch(/h-\[78px\]/);
    expect(sirkel).toMatch(/data-pulse-dag-fot/);
    expect(sirkel).toMatch(/h-\[16px\]/);
    expect(tall.indexOf('data-pulse-tall-siffer')).toBeLessThan(
      tall.indexOf('data-pulse-tall-etikett'),
    );
  });

  it('Analyser er én boks: Innboks-hode + fire KPI-rader uten dither', () => {
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    const analyser = funksjon(kort, 'PulseAnalyserKort');
    expect(analyser).toMatch(/PulseIkonFlate/);
    expect(analyser).toMatch(/ChartColumn/);
    expect(analyser).toMatch(/data-analyser-tittel/);
    expect(analyser).toMatch(/Analyse/);
    expect(analyser).toMatch(/siste 30 dager/);
    expect(analyser).toMatch(/Se tallene/);
    expect(analyser).toMatch(/data-analyser-kpi/);
    expect(analyser).toMatch(/TrendingUp/);
    expect(analyser).toMatch(/TrendingDown/);
    expect(analyser).not.toMatch(/RevenueLineChart/);
    expect(analyser).not.toMatch(/DitherGrowthChart/);
    expect(analyser).not.toMatch(/DitherDonutChart/);
    expect(analyser).not.toMatch(/#0066ff/);
    expect(analyser.match(/PHONE_DEST_FYLL/g)?.length).toBe(1);
    expect(analyser).not.toMatch(/data-analyser-del="1"/);
    expect(analyser).not.toMatch(/data-analyser-del="2"/);
  });

  it('undersider beholder dest-piller i top-bar 2; tittel + verktøy under og tettere', () => {
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    expect(shell).toMatch(/data-phone-top-bar="1"/);
    expect(shell).toMatch(/data-phone-top-bar="2"/);
    expect(shell).toMatch(/data-shell-logo/);
    expect(shell).toMatch(/data-phone-search/);
    expect(shell).toMatch(/data-phone-dest/);
    expect(shell).toMatch(/PhoneHScroll/);
    expect(shell).toMatch(/data-phone-side-tittel/);
    expect(shell).toMatch(/data-phone-side-under/);
    expect(shell).toMatch(/InboxTopBar2/);
    expect(shell).not.toMatch(/data-shell-tilbake/);
    expect(shell).not.toMatch(/TilbakePil/);
    expect(shell).not.toMatch(/absolute inset-x-10 truncate text-center/);
    const bar2Start = shell.indexOf('data-phone-top-bar="2"');
    const dest = shell.indexOf('data-phone-dest', bar2Start);
    const under = shell.indexOf('data-phone-side-under');
    const tittel = shell.indexOf('data-phone-side-tittel');
    const inbox = shell.indexOf('<InboxTopBar2', under);
    expect(bar2Start).toBeGreaterThan(-1);
    expect(dest).toBeGreaterThan(bar2Start);
    expect(under).toBeGreaterThan(dest);
    expect(tittel).toBeGreaterThan(under);
    expect(inbox).toBeGreaterThan(tittel);
    expect(shell.slice(bar2Start, under)).toMatch(/PhoneHScroll/);
    expect(shell.slice(bar2Start, under)).not.toMatch(/InboxTopBar2/);
    expect(shell).toMatch(/PHONE_SIDE_UNDER/);
    const chrome = utenKommentarer(les('../app/(app)/_shell/phone-chrome.ts'));
    expect(chrome).toMatch(/PHONE_SIDE_UNDER/);
    expect(chrome).toMatch(/pt-1/);
  });

  it('Sortering-ark uten Sortering/Tid/Gruppe-overskrifter, mindre tekst', () => {
    const ark = utenKommentarer(les('../app/(app)/_shell/sortering-ark.tsx'));
    expect(ark).not.toMatch(/data-sortering-tittel/);
    expect(ark).not.toMatch(/>Sortering</);
    expect(ark).not.toMatch(/text-label text-fg-muted/);
    expect(ark).toMatch(/text-label/);
    expect(ark).not.toMatch(/text-body/);
    expect(ark).not.toMatch(/font-\[700\]/);
    const bar = utenKommentarer(les('../app/(app)/innboks/_top-bar2.tsx'));
    expect(bar).not.toMatch(/tittel="Tid"/);
    expect(bar).not.toMatch(/tittel="Gruppe"/);
    expect(bar).toMatch(/Nyeste/);
    expect(bar).toMatch(/Eldste/);
    expect(bar).toMatch(/INNBOKS_GRUPPER/);
    const ku = utenKommentarer(les('../app/(app)/kunder/page.tsx'));
    expect(ku).not.toMatch(/tittel="Type"/);
    expect(ku).not.toMatch(/tittel="Tid"/);
    expect(ku).toMatch(/Nyeste/);
    expect(ku).toMatch(/Eldste/);
    expect(ku).toMatch(/Endwise/);
  });
});
