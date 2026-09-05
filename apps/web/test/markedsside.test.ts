import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TIERS } from '@endwise/modules/billing/plans';
import { describe, expect, it } from 'vitest';
import { DEMO_EPOST, DEMO_LENKE } from '../app/_markeds/demo';
import {
  BILDE_SLOTS,
  FOOTER_LENKER,
  H1,
  LOFTER,
  PRIS_KORT,
  PRODUKT,
  VALGT_NIVAA,
  visManedspris,
} from '../app/_markeds/innhold';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('F5-35 markedsside — Jonas-fasit 05.09.2026', () => {
  const side = utenKommentarer(les('../app/_markeds/markeds-side.tsx'));
  const chrome = utenKommentarer(les('../app/_markeds/markeds-chrome.tsx'));
  const rot = les('../app/page.tsx');
  const innhold = les('../app/_markeds/innhold.ts');

  it('rendrer H1 og hero-CTA fra fasiten', () => {
    expect(H1).toBe('Verkstedet, samlet.');
    expect(side).toMatch(/data-markeds-seksjon="hero"/);
    expect(chrome).toMatch(/tekst = 'Book demo'/);
    expect(chrome).toMatch(/Logg inn/);
    expect(chrome).toMatch(/DEMO_LENKE/);
    expect(DEMO_EPOST).toBe('hei@endwise.no');
    expect(DEMO_LENKE).toMatch(/^mailto:hei@endwise\.no/);
  });

  it('seksjoner kommer i fasit-rekkefølge', () => {
    const rekkefolge = ['hero', 'lofter', 'produkt', 'pris', 'tillit', 'bunn-cta'] as const;
    let sist = -1;
    for (const id of rekkefolge) {
      const i = side.indexOf(`data-markeds-seksjon="${id}"`);
      expect(i).toBeGreaterThan(sist);
      sist = i;
    }
  });

  it('tre like løfter: Booking · Innboks · Verkstedet', () => {
    expect(LOFTER.map((l) => l.tittel)).toEqual(['Booking', 'Innboks', 'Verkstedet']);
  });

  it('produkt veksler tekst/bilde én gang (desktop så telefon)', () => {
    expect(PRODUKT.map((p) => p.layout)).toEqual(['bilde-hoyre', 'bilde-venstre']);
    expect(PRODUKT.map((p) => p.bilde)).toEqual(['desktop', 'phone']);
  });

  it('pris følger TIERS-låsen 4490 / 8490 / 12490 eks. mva, Pro valgt', () => {
    expect(TIERS.map((t) => t.priceMonthlyMinor)).toEqual([449_000, 849_000, 1_249_000]);
    expect(PRIS_KORT.map((k) => k.ore)).toEqual(TIERS.map((t) => t.priceMonthlyMinor));
    expect(PRIS_KORT.map((k) => k.pris)).toEqual([
      visManedspris(449_000),
      visManedspris(849_000),
      visManedspris(1_249_000),
    ]);
    expect(visManedspris(449_000).replace(/\s/g, '')).toBe('4490');
    expect(VALGT_NIVAA).toBe('pro');
    expect(PRIS_KORT.find((k) => k.valgt)?.key).toBe('pro');
    expect(side).toMatch(/eks\. mva/);
    expect(side).toMatch(/Ta kontakt/);
    expect(innhold).toMatch(/ingen pris per sete/i);
  });

  it('3–5 faste bildespor, uten stock-mekaniker og uten arkitektur-JPEG som default', () => {
    const ids = Object.keys(BILDE_SLOTS);
    expect(ids.length).toBeGreaterThanOrEqual(3);
    expect(ids.length).toBeLessThanOrEqual(5);
    for (const slot of Object.values(BILDE_SLOTS)) {
      expect(slot.kilde).toBeUndefined();
    }
    expect(utenKommentarer(innhold)).not.toMatch(/hero\.jpg|img_1\.jpg/);
    expect(utenKommentarer(innhold)).not.toMatch(/from ['"]@\/public\/images\//);
    expect(les('../app/_markeds/produkt-ramme.tsx')).toMatch(/aspect-\[16\/10\]/);
    expect(les('../app/_markeds/produkt-ramme.tsx')).toMatch(/aspect-\[9\/19\]/);
    expect(les('../app/_markeds/produkt-ramme.tsx')).toMatch(/rounded-\[14px\]/);
  });

  it('ingen forbudt merkevare: grønn CTA, Start gratis, roadmap-rød, sticky megameny, blobatar', () => {
    const markeds = [
      side,
      chrome,
      utenKommentarer(innhold),
      utenKommentarer(les('../app/_markeds/cta.ts')),
    ].join('\n');
    expect(markeds).not.toMatch(/Start gratis/);
    expect(markeds).not.toMatch(/#EE2924|#1ED27D.*cta|bg-success|bg-green/i);
    expect(markeds).not.toMatch(/sticky/);
    expect(markeds).not.toMatch(/blobatar|carousel|<video/i);
    expect(les('../app/_markeds/cta.ts')).toMatch(/bg-\[#111\]/);
    expect(chrome).toMatch(/#1ED27D/);
    expect(chrome).not.toMatch(/sticky/);
  });

  it('footer peker på personvern, vilkår og kontakt', () => {
    expect(FOOTER_LENKER.map((l) => l.href)).toEqual(['/personvern', '/vilkar', '/kontakt']);
    expect(les('../app/personvern/page.tsx')).toMatch(/Personvern/);
    expect(les('../app/vilkar/page.tsx')).toMatch(/Vilkår/);
    expect(les('../app/kontakt/page.tsx')).toMatch(/DEMO_EPOST|DEMO_LENKE/);
  });

  it('innlogget bruker redirectes fortsatt — sesjonsporten bor i page.tsx', () => {
    expect(rot).toMatch(/organization\.setActive|organization\.list/);
    expect(rot).toMatch(/slug === ['"]endwise['"]/);
    expect(rot).toMatch(/destinasjonNarSesjonFeiler/);
    expect(rot).toMatch(/MarkedsSide/);
  });
});
