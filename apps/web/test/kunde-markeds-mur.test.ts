import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('F41-09: uinnlogget <sub>.endwise.no er markedsside', () => {
  it('hjem uten sesjon er KundeMarkedsFlate med ett Logg inn', () => {
    const hjem = les('../app/%5Fkunde/[slug]/page.tsx');
    const skall = les('../app/%5Fkunde/_lib/skall.tsx');
    expect(hjem).toMatch(/kundeErInnlogget/);
    expect(hjem).toMatch(/KundeMarkedsFlate/);
    expect(skall).toMatch(/data-kunde-marked/);
    expect(skall).toMatch(/href="\/logg-inn"/);
    expect(skall).toMatch(/Logg inn/);
    expect(skall).toMatch(/KundeKontakt/);
    expect(skall).toMatch(/FORBUDT_CTA = '#0066ff'/);
    expect(skall).not.toMatch(/bg-\[#0066ff\]|text-\[#0066ff\]/);
    expect(hjem).not.toMatch(/#0066ff/);
  });

  it('nav vises bare innlogget; beskyttede ruter krever sesjon', () => {
    const skall = les('../app/%5Fkunde/_lib/skall.tsx');
    expect(skall).toMatch(/kundeErInnlogget/);
    expect(skall).toMatch(/data-kunde-innlogget/);
    expect(skall).toMatch(/innlogget \? \(/);
    const sider = [
      'bestill',
      'bookinger',
      'kjoretoy',
      'meldinger',
      'deler',
      'kvitteringer',
      'mine-data',
      'min-side',
      'profil',
    ];
    for (const side of sider) {
      const kilde = les(`../app/%5Fkunde/[slug]/${side}/page.tsx`);
      expect(kilde).toMatch(/krevKundeInnlogging/);
    }
    const sesjon = les('../app/%5Fkunde/_lib/sesjon.ts');
    expect(sesjon).toMatch(/redirect\('\/logg-inn' as Route\)/);
    expect(sesjon).toMatch(/schema\.customers/);
    expect(sesjon).toMatch(/lesTenantIdFraSlug/);
    expect(sesjon).toMatch(/getSession/);
    expect(les('../app/%5Fkunde/[slug]/logg-inn/page.tsx')).not.toMatch(/krevKundeInnlogging/);
    expect(les('../app/%5Fkunde/[slug]/personvern/page.tsx')).not.toMatch(/krevKundeInnlogging/);
  });
});
