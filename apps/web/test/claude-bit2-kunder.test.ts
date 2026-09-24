import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FORHANDLER_NAV } from '../app/(app)/_shell/nav.ts';
import { DEALER_PULSE_KEYS } from '../app/(app)/_shell/phone-home.ts';
import {
  filtrerKunderAlfa,
  grupperKunderAlfa,
  KUNDER_ALFA,
  KUNDER_SIDE_STORRELSE,
  kundeAlfaBokstav,
  kundeAlfaSeksjon,
  kunderAlfaScrollmaal,
  kunderAlfaTomme,
  kunderSide,
  kunderSideEtikett,
} from '../app/(app)/kunder/_alfa.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

const NORSK_INDEKS = [
  '#',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
  'Æ',
  'Ø',
  'Å',
] as const;

describe('Claude Design BIT 2 — Kunder alfa-rail + profil', () => {
  it('alfa-rail er Apple-Contacts: full NO-indeks, list-viewport, ikke chrome-overlap', () => {
    const rail = utenKommentarer(les('../app/(app)/kunder/_alfa-rail.tsx'));
    expect(rail).toMatch(/data-kunder-alfa-rail/);
    expect(rail).toMatch(/sticky/);
    expect(rail).toMatch(/h-full/);
    expect(rail).toMatch(/flex-1/);
    expect(rail).toMatch(/text-\[10px\]/);
    expect(rail).toMatch(/text-fg-faint/);
    expect(rail).not.toMatch(/absolute top-0/);
    expect(rail).not.toMatch(/justify-center gap/);
    expect(rail).not.toMatch(/fixed inset/);
    expect(rail).not.toMatch(/z-\[60\]/);
    expect([...KUNDER_ALFA]).toEqual([...NORSK_INDEKS]);
    expect(KUNDER_ALFA).toContain('Q');
    expect(KUNDER_ALFA).toContain('W');
    expect(KUNDER_ALFA).toContain('X');
    expect(KUNDER_ALFA).toContain('Z');
    expect(KUNDER_ALFA).toContain('Æ');
    expect(KUNDER_ALFA).toContain('Ø');
    const liste = utenKommentarer(les('../app/(app)/kunder/page.tsx'));
    expect(liste).toMatch(/KunderAlfaListe/);
    expect(liste).toMatch(/data-kunder-liste|KunderAlfaListe/);
    expect(liste).toMatch(/PhoneSokFelt/);
    expect(liste).toMatch(/Nyeste/);
    expect(liste).toMatch(/Eldste/);
    expect(liste).toMatch(/SorteringArk/);
    expect(liste).toMatch(/NyKunde/);
    expect(liste).toMatch(/RegistrerKjoretoy/);
    expect(liste).not.toMatch(/custTrash|Slett kunde/);
    expect(liste).not.toMatch(/pr-\[30px\]/);
    expect(liste).not.toMatch(/filtrerKunderAlfa/);
    expect(liste).not.toMatch(/data-kunder-pager/);
    expect(liste).toMatch(/Navn, telefon, e-post eller reg\.nr/);
  });

  it('scroll-to-seksjon + dim tomme bokstaver — ikke filter-only', () => {
    expect(kundeAlfaBokstav('Åse Vik')).toBe('Å');
    expect(kundeAlfaBokstav('øystein')).toBe('Ø');
    expect(kundeAlfaSeksjon('Anne')).toBe('A');
    expect(kundeAlfaSeksjon('3M Motor')).toBe('#');
    expect(kundeAlfaSeksjon('')).toBe('#');
    const liste = [{ name: 'Anne' }, { name: 'Åse' }, { name: 'Øyvind' }, { name: '3M' }];
    expect(grupperKunderAlfa(liste).map((g) => [g.bokstav, g.kunder.map((k) => k.name)])).toEqual([
      ['#', ['3M']],
      ['A', ['Anne']],
      ['Ø', ['Øyvind']],
      ['Å', ['Åse']],
    ]);
    expect([...kunderAlfaTomme(liste)]).toContain('Q');
    expect([...kunderAlfaTomme(liste)]).toContain('S');
    expect([...kunderAlfaTomme(liste)]).not.toContain('#');
    expect([...kunderAlfaTomme(liste)]).not.toContain('A');
    expect(
      kunderAlfaScrollmaal({ getBoundingClientRect: () => ({ top: 100 }), scrollTop: 40 }, null),
    ).toBe(0);
    expect(
      kunderAlfaScrollmaal(
        { getBoundingClientRect: () => ({ top: 100 }), scrollTop: 40 },
        { getBoundingClientRect: () => ({ top: 220 }) },
      ),
    ).toBe(160);
    expect(filtrerKunderAlfa(liste, 'A').map((k) => k.name)).toEqual(['Anne']);
    expect(KUNDER_SIDE_STORRELSE).toBe(25);
    const mange = Array.from({ length: 26 }, (_, i) => ({ name: `K${i}` }));
    expect(kunderSide(mange, 0)).toHaveLength(25);
    expect(kunderSide(mange, 1)).toHaveLength(1);
    expect(kunderSideEtikett(26, 0)).toBe('Viser 1–25 av 26');
    const api = les('../../../apps/api/src/trpc/routers/customers.ts');
    expect(api).toMatch(/list: staffProcedure/);
    expect(api).not.toMatch(/delete: staffProcedure/);
    const skall = utenKommentarer(les('../app/(app)/kunder/_alfa-liste.tsx'));
    expect(skall).toMatch(/data-kunder-liste-scroll/);
    expect(skall).toMatch(/data-kunder-seksjon/);
    expect(skall).toMatch(/data-kunder-seksjon-hode/);
    expect(skall).toMatch(/overflow-y-auto/);
    expect(skall).not.toMatch(/min-h-\[420px\]/);
  });

  it('preview fyller list-viewport — ingen grå søk-stripe, ingen Next-portal over rail', () => {
    const preview = utenKommentarer(les('../app/kunder-preview/page.tsx'));
    expect(preview).toMatch(/KunderAlfaListe/);
    expect(preview).toMatch(/shrink-0/);
    expect(preview).toMatch(/h-dvh|min-h-0 flex-1/);
    expect(preview).not.toMatch(/min-h-\[420px\]/);
    expect(preview).not.toMatch(/filtrerKunderAlfa/);
    expect(preview).not.toMatch(/data-kunder-pager/);
    expect(preview).not.toMatch(/pr-\[30px\]/);
    expect(preview).toMatch(/Navn, telefon, e-post eller reg\.nr/);
    expect(preview).toMatch(/nextjs-portal/);
    const css = les('../app/kunder-preview/preview.css');
    expect(css).toMatch(/nextjs-portal/);
    expect(css).toMatch(/display:\s*none/i);
  });

  it('FIX B: ingen klone-rails i andre Bit-previews', () => {
    const previews = [
      '../app/lager-preview/page.tsx',
      '../app/butikk-preview/page.tsx',
      '../app/visual-forms-preview/page.tsx',
      '../app/innboks-preview/page.tsx',
      '../app/jobber-preview/page.tsx',
      '../app/pulse-preview/page.tsx',
      '../app/tjenester-preview/page.tsx',
      '../app/org-preview/page.tsx',
    ];
    for (const rel of previews) {
      const kilde = utenKommentarer(les(rel));
      expect(kilde).not.toMatch(/data-kunder-alfa-rail/);
      expect(kilde).not.toMatch(/absolute top-0 right-1 bottom-0/);
    }
  });

  it('profil har Kontakt · Kjøretøy · Jobber · Meldinger uten å rive skjemaer', () => {
    const kort = utenKommentarer(les('../app/(app)/kunder/[id]/page.tsx'));
    const endre = utenKommentarer(les('../app/(app)/kunder/_endre.tsx'));
    expect(endre).toMatch(/data-kunde-seksjon="kontakt"/);
    expect(endre).toMatch(/customers\.update/);
    expect(kort).toMatch(/data-kunde-seksjon="kjoretoy"/);
    expect(kort).toMatch(/data-kunde-seksjon="jobber"/);
    expect(kort).toMatch(/data-kunde-seksjon="meldinger"/);
    expect(kort).toMatch(/tittel="Jobber"/);
    expect(kort).toMatch(/Ingen jobber registrert/);
    expect(kort).toMatch(/RegistrerKjoretoy/);
    expect(kort).toMatch(/KundeEndre/);
    expect(kort).toMatch(/data-kunde-ny-jobb/);
    expect(kort).toMatch(/\/bookinger\/ny/);
    expect(kort).not.toMatch(/Slett kunde/);
    expect(kort).not.toMatch(/custTrash/);
    expect(kort).toMatch(/customers\.addNote/);
  });

  it('BIT 1 hjem/chrome er urørt — ingen nye piller, ingen Tjenester-chrome', () => {
    expect([...DEALER_PULSE_KEYS]).toEqual([
      'idag',
      'innboks',
      'lager',
      'analyser',
      'team',
      'jobb',
    ]);
    const nav = les('../app/(app)/_shell/nav.ts');
    expect(nav).toMatch(/FORHANDLER_NAV/);
    expect(FORHANDLER_NAV.some((n) => n.href === '/kunder')).toBe(true);
    const faner = les('../app/(app)/kunder/_faner.ts');
    expect(faner).toMatch(/Alle kunder/);
    expect(faner).toMatch(/Opprett kunde/);
    expect(faner).toMatch(/Registrer kjøretøy/);
    expect(faner).not.toMatch(/Tjenester/);
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    expect(hjem).toMatch(/PulseAnalyserKort/);
    expect(hjem).toMatch(/tallKortStats/);
    const analyse = les('../app/(app)/analyse/page.tsx');
    expect(analyse.length).toBeGreaterThan(100);
  });
});
