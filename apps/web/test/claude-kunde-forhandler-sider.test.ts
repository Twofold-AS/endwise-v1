import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { kundeFaneAktiv } from '../app/%5Fkunde/_lib/faner.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('F42-01: Claude-design på kundeside og forhandlerside', () => {
  it('kundesiden har seks faner — Hjem Bestill Bookinger Meldinger Kjøretøy Profil', () => {
    const faner = les('../app/%5Fkunde/_lib/faner.ts');
    const rail = les('../app/%5Fkunde/_lib/fane-rail.tsx');
    const skall = les('../app/%5Fkunde/_lib/skall.tsx');
    expect(faner).toMatch(/label: 'Hjem'/);
    expect(faner).toMatch(/label: 'Bestill'/);
    expect(faner).toMatch(/label: 'Bookinger'/);
    expect(faner).toMatch(/label: 'Meldinger'/);
    expect(faner).toMatch(/label: 'Kjøretøy'/);
    expect(faner).toMatch(/label: 'Profil'/);
    expect(faner).not.toMatch(
      /label: 'Deler'|label: 'Kvitteringer'|label: 'Mine data'|label: 'Min side'/,
    );
    expect(skall).toMatch(/KundeFaneRail/);
    expect(rail).toMatch(/data-kunde-faner/);
    expect(skall).not.toMatch(/bg-\[#0066ff\]|text-\[#0066ff\]/);
    expect(kundeFaneAktiv('/', '/')).toBe(true);
    expect(kundeFaneAktiv('/bestill', '/bestill')).toBe(true);
    expect(kundeFaneAktiv('/bestill', '/')).toBe(false);
  });

  it('innlogget hjem er Hei + aktiv jobb + Bestill time, ikke ti piller', () => {
    const hjem = les('../app/%5Fkunde/_lib/hjem.tsx');
    const side = les('../app/%5Fkunde/[slug]/page.tsx');
    expect(side).toMatch(/KundeHjemFlate/);
    expect(hjem).toMatch(/Hei,/);
    expect(hjem).toMatch(/Bestill time/);
    expect(hjem).toMatch(/Bestilt/);
    expect(hjem).toMatch(/Mottatt/);
    expect(hjem).toMatch(/Arbeid/);
    expect(hjem).toMatch(/Klar/);
    expect(hjem).toMatch(/kunde\.bookinger/);
    expect(hjem).not.toMatch(/#0066ff/);
    expect(les('../app/%5Fkunde/[slug]/min-side/page.tsx')).toMatch(/KundeHjemFlate/);
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
