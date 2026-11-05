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
    expect(les('../app/%5Fkunde/_lib/bencho/GlassDock.tsx')).toMatch(/gdock-dot/);
    expect(les('../app/%5Fkunde/_lib/bencho/GlassDock.css')).toMatch(/backdrop-filter/);
    expect(les('../app/%5Fkunde/_lib/bencho/GlassDock.tsx')).toMatch(/bencho\.dev\/blocks\/dock/);
    expect(dock).not.toMatch(/data-ronny-forstor|100dvh|#0066ff/);
    expect(skall).not.toMatch(/bg-\[#0066ff\]|text-\[#0066ff\]/);
    expect(kundeFaneAktiv('/', '/')).toBe(true);
    expect(kundeFaneAktiv('/bookinger', '/bookinger')).toBe(true);
    expect(kundeFaneAktiv('/bookinger', '/')).toBe(false);
  });

  it('header har forhandlerlogo, bjelle og kurv som bunn-ark', () => {
    const topp = les('../app/%5Fkunde/_lib/topp.tsx');
    const skall = les('../app/%5Fkunde/_lib/skall.tsx');
    expect(skall).toMatch(/KundeTopp/);
    expect(topp).toMatch(/IconButton/);
    expect(topp).toMatch(/Bell/);
    expect(topp).toMatch(/ShoppingCart/);
    expect(topp).toMatch(/kunde\.varsler/);
    expect(topp).toMatch(/data-kunde-varsler/);
    expect(topp).toMatch(/data-kunde-kurv/);
    expect(topp).toMatch(/placement="bottom"|KundeBunnArk/);
    expect(topp).not.toMatch(/sendMelding|kunde\.meldinger|#0066ff/);
    expect(les('../app/%5Fkunde/_lib/ark.tsx')).toMatch(/placement="bottom"/);
  });

  it('innlogget hjem er Hei + Bestill time; aktiv jobb er kort med Board-progress', () => {
    const hjem = les('../app/%5Fkunde/_lib/hjem.tsx');
    const jobb = les('../app/%5Fkunde/_lib/aktiv-jobb.tsx');
    const side = les('../app/%5Fkunde/[slug]/page.tsx');
    expect(side).toMatch(/KundeHjemFlate/);
    expect(hjem).toMatch(/Hei,/);
    expect(hjem).toMatch(/Bestill time/);
    expect(hjem).not.toMatch(/Bestilt|data-kunde-faner|#0066ff/);
    expect(jobb).toMatch(/rounded-\[20px\]/);
    expect(jobb).toMatch(/ProgressBar/);
    expect(jobb).toMatch(/Mottatt → Ferdig/);
    expect(jobb).toMatch(/data-kunde-jobb-hjelp/);
    expect(jobb).toMatch(/kunde\.aktivJobb/);
    expect(jobb).toMatch(/@endwise\/modules\/kunde\/fase/);
    expect(jobb).not.toMatch(/from '@endwise\/modules\/kunde'/);
    expect(jobb).not.toMatch(/#0066ff/);
    expect(les('../app/%5Fkunde/[slug]/min-side/page.tsx')).toMatch(/KundeHjemFlate/);
  });

  it('platform kan laste opp forhandlerlogo', () => {
    const side = les('../app/(app)/endwise/forhandlere/page.tsx');
    expect(side).toMatch(/tenants\.lastOppLogo/);
    expect(side).toMatch(/Logo til kundeside/);
  });

  it('forhandler desktop-hjem har Dagens timeplan under pulse', () => {
    const home = les('../app/(app)/home/page.tsx');
    expect(home).toMatch(/VerkstedetDesktop/);
    expect(home).toMatch(/DealerPulseKort/);
    expect(home).toMatch(/Dagens timeplan/);
    expect(home).toMatch(/\/jobber/);
    expect(home).not.toMatch(/border-l-\[3px\]|#0066ff/);
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
