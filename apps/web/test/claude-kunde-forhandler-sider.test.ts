import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { kundeFaneAktiv } from '../app/%5Fkunde/_lib/faner.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('F42-04: kundeside header, dock og aktiv jobb', () => {
  it('dock er Hjem Bookinger Meldinger Profil — ingen fane-rail', () => {
    const faner = les('../app/%5Fkunde/_lib/faner.ts');
    const dock = les('../app/%5Fkunde/_lib/dock.tsx');
    const skall = les('../app/%5Fkunde/_lib/skall.tsx');
    expect(faner).toMatch(/label: 'Hjem'/);
    expect(faner).toMatch(/label: 'Bookinger'/);
    expect(faner).toMatch(/label: 'Meldinger'/);
    expect(faner).toMatch(/label: 'Profil'/);
    expect(faner).not.toMatch(/label: 'Bestill'|label: 'Kjøretøy'/);
    expect(faner).not.toMatch(
      /label: 'Deler'|label: 'Kvitteringer'|label: 'Mine data'|label: 'Min side'/,
    );
    expect(skall).toMatch(/KundeDock/);
    expect(skall).not.toMatch(/KundeFaneRail|data-kunde-faner/);
    expect(dock).toMatch(/data-kunde-dock/);
    expect(dock).toMatch(/data-kunde-ronny-dock/);
    expect(dock).toMatch(/GlassDock/);
    expect(dock).toMatch(/from '\.\/bencho\/GlassDock/);
    // Ronny-boksen: ingen hvit panel-bakgrunn, ikonet fyller hele boksen.
    expect(dock).toMatch(/utenPanel/);
    expect(dock).toMatch(/ronnySizeForSirkel/);
    expect(les('../app/%5Fkunde/_lib/bencho/GlassDock.css')).toMatch(/data-uten-panel/);
    expect(les('../app/%5Fkunde/_lib/bencho/GlassDock.css')).toMatch(
      /\.gdock\[data-uten-panel\][^}]*background: transparent/,
    );
    expect(les('../app/%5Fkunde/_lib/bencho/GlassDock.tsx')).toMatch(/gdock-dot/);
    expect(les('../app/%5Fkunde/_lib/bencho/GlassDock.tsx')).toMatch(/bencho\.dev\/blocks\/dock/);
    expect(les('../app/%5Fkunde/_lib/bencho/GlassDock.tsx')).toMatch(/data-kunde-dock-statisk/);
    expect(les('../app/%5Fkunde/_lib/bencho/GlassDock.tsx')).not.toMatch(
      /magnify\s*=|translateY\(|scale\(|cubic-bezier/,
    );
    expect(les('../app/%5Fkunde/_lib/bencho/GlassDock.css')).toMatch(/border-radius: 24px/);
    expect(les('../app/%5Fkunde/_lib/bencho/GlassDock.css')).toMatch(/box-shadow: none/);
    expect(les('../app/%5Fkunde/_lib/bencho/GlassDock.css')).not.toMatch(
      /cubic-bezier|scale\(|translateY/,
    );
    expect(dock).toMatch(/data-surface="flat"/);
    expect(dock).not.toMatch(/data-surface="glass"|magnify=/);
    expect(dock).not.toMatch(/data-ronny-forstor|100dvh|#0066ff/);
    expect(skall).not.toMatch(/bg-\[#0066ff\]|text-\[#0066ff\]/);
    expect(kundeFaneAktiv('/', '/')).toBe(true);
    expect(kundeFaneAktiv('/bookinger', '/bookinger')).toBe(true);
    expect(kundeFaneAktiv('/bookinger', '/')).toBe(false);
  });

  it('header har logo, bjelle, kurv og innstillinger — pluss BoardUI-søk, ingen skillelinje', () => {
    const topp = les('../app/%5Fkunde/_lib/topp.tsx');
    const skall = les('../app/%5Fkunde/_lib/skall.tsx');
    expect(skall).toMatch(/KundeTopp/);
    expect(topp).toMatch(/IconButton/);
    expect(topp).toMatch(/Bell/);
    expect(topp).toMatch(/ShoppingCart/);
    // Tredje ikon: innstillinger, som åpner kundens egen meny som bunn-ark.
    expect(topp).toMatch(/Settings/);
    expect(topp).toMatch(/data-kunde-innstillinger/);
    expect(topp).toMatch(/tittel="Innstillinger"/);
    expect(topp).toMatch(/Logg ut/);
    expect(topp).toMatch(/kunde\.varsler/);
    expect(topp).toMatch(/data-kunde-varsler/);
    expect(topp).toMatch(/data-kunde-kurv/);
    expect(topp).toMatch(/placement="bottom"|KundeBunnArk/);
    // Søkefelt fra BoardUI under logo-raden, samme innrykk (px-3).
    expect(topp).toMatch(/SearchField/);
    expect(topp).toMatch(/data-kunde-sok/);
    expect(topp).toMatch(/px-3/);
    // Ingen skillelinje mellom header og innhold.
    expect(skall).not.toMatch(/border-b border-border/);
    expect(topp).not.toMatch(/sendMelding|kunde\.meldinger|#0066ff/);
    expect(les('../app/%5Fkunde/_lib/ark.tsx')).toMatch(/placement="bottom"/);
  });

  it('kjøretøy-kort er Bencho context-meter + step-player, med demo-kort merket', () => {
    const seksjon = les('../app/%5Fkunde/_lib/kjoretoy-kort.tsx');
    const meter = les('../app/%5Fkunde/_lib/bencho/ContextMeter.tsx');
    const meterCss = les('../app/%5Fkunde/_lib/bencho/ContextMeter.css');
    const spiller = les('../app/%5Fkunde/_lib/bencho/StepPlayer.tsx');
    const skall = les('../app/%5Fkunde/_lib/skall.tsx');
    // Kortet ligger under headeren i skallet, søkefiltret.
    expect(skall).toMatch(/KjoretoySeksjon/);
    expect(skall).toMatch(/KundeSokProvider/);
    expect(seksjon).toMatch(/ContextMeter/);
    expect(seksjon).toMatch(/StepPlayer/);
    expect(seksjon).toMatch(/kunde\.kjoretoy/);
    expect(seksjon).toMatch(/kunde\.aktivJobb/);
    // Tre demo-kort, tydelig merket som demo i koden.
    const data = les('../app/%5Fkunde/_lib/kjoretoy-kort-data.ts');
    expect(data).toMatch(/DEMO/);
    expect(data.match(/id: 'demo-/g)?.length).toBe(3);
    // context-meter-tilpasningene: navn/null-state, info-lenke, grå to-delt boks.
    expect(data).toMatch(/Finner ingen eierskap/);
    expect(meter).toMatch(/href="\/kjoretoy"/);
    expect(meter).toMatch(/ctx-boks/);
    expect(meter).toMatch(/ctx-bilde/);
    expect(meter).toMatch(/Årsmodell/);
    expect(meter).toMatch(/Regnr/);
    expect(meter).toMatch(/bencho\.dev\/\?c=context-meter/);
    // Statusbar: like store fordelingsbokser (flex: 1 1 0), ink-fyll.
    expect(meterCss).toMatch(/\.ctx-seg \{[^}]*flex: 1 1 0/);
    expect(meterCss).toMatch(/ctx-seg\[data-fylt\]/);
    expect(meterCss).not.toMatch(/#0066ff/);
    // Step-player: MIT-kreditert, uten auto-avspilling (ingen play-knapp/timer).
    expect(spiller).toMatch(/bencho\.dev\/\?c=step-player/);
    expect(spiller).not.toMatch(/spl-go|setInterval|requestAnimationFrame/);
    expect(seksjon).not.toMatch(/#0066ff/);
  });

  it('innlogget hjem er Hei + Bestill time', () => {
    const hjem = les('../app/%5Fkunde/_lib/hjem.tsx');
    const side = les('../app/%5Fkunde/[slug]/page.tsx');
    expect(side).toMatch(/KundeHjemFlate/);
    expect(hjem).toMatch(/Hei,/);
    expect(hjem).toMatch(/Bestill time/);
    expect(hjem).not.toMatch(/Bestilt|data-kunde-faner|#0066ff/);
    expect(les('../app/%5Fkunde/[slug]/min-side/page.tsx')).toMatch(/KundeHjemFlate/);
  });

  it('platform kan laste opp forhandlerlogo', () => {
    const side = les('../app/(app)/endwise/forhandlere/page.tsx');
    expect(side).toMatch(/tenants\.lastOppLogo/);
    expect(side).toMatch(/Logo til kundeside/);
  });

  it('forhandler desktop-hjem har Dagens timeplan under pulse', () => {
    const home = les('../app/(app)/home/page.tsx');
    const bred = les('../app/(app)/home/_desktop-hjem.tsx');
    const tidslinje = les('../app/(app)/_shell/dag-tidslinje.tsx');
    expect(home).toMatch(/VerkstedetDesktop/);
    expect(bred).toMatch(/useDealerHjemKort/);
    expect(bred).toMatch(/DagTidslinje/);
    expect(tidslinje).toMatch(/Dagens timeplan/);
    expect(tidslinje).toMatch(/\/jobber/);
    expect(bred).not.toMatch(/border-l-\[3px\]|#0066ff/);
  });

  it('Ronny ligger bare i top-bar — ingen oransje sirkel på hjem', () => {
    const home = les('../app/(app)/home/page.tsx');
    const fab = les('../app/(app)/_workshop/workshop-bloub.tsx');
    const shell = les('../app/(app)/_shell/phone-shell.tsx');
    expect(home).not.toMatch(/RonnySirkel|#c45c26/);
    expect(fab).not.toMatch(/RonnySirkel/);
    expect(shell).toMatch(/data-ronny-avatar/);
  });

  it('profilmeny-CTA er ink, ikke #0066ff', () => {
    const meny = les('../app/(app)/_shell/phone-profil-meny.tsx');
    expect(meny).toMatch(/Ditt abonnement/);
    expect(meny).toMatch(/bg-fg/);
    expect(meny).not.toMatch(/#0066ff/);
  });
});
