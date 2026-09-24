import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FORHANDLER_NAV } from '../app/(app)/_shell/nav.ts';
import { DEALER_PULSE_KEYS } from '../app/(app)/_shell/phone-home.ts';
import {
  filtrerKunderAlfa,
  KUNDER_ALFA,
  KUNDER_SIDE_STORRELSE,
  kundeAlfaBokstav,
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

describe('Claude Design BIT 2 — Kunder alfa-rail + profil', () => {
  it('alfa-rail er høyre absolute A–Å, ikke topp-chips', () => {
    const rail = utenKommentarer(les('../app/(app)/kunder/_alfa-rail.tsx'));
    expect(rail).toMatch(/data-kunder-alfa-rail/);
    expect(rail).toMatch(/absolute/);
    expect(rail).toMatch(/right-1/);
    expect(rail).toMatch(/flex-col/);
    expect(rail).not.toMatch(/flex-row/);
    expect(rail).not.toMatch(/role="tablist"/);
    expect([...KUNDER_ALFA]).toEqual([
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
      'R',
      'S',
      'T',
      'U',
      'V',
      'Y',
      'Å',
    ]);
    expect(KUNDER_ALFA).not.toContain('Q');
    expect(KUNDER_ALFA).not.toContain('Ø');
    const liste = utenKommentarer(les('../app/(app)/kunder/page.tsx'));
    expect(liste).toMatch(/KunderAlfaRail/);
    expect(liste).toMatch(/data-kunder-liste/);
    expect(liste).toMatch(/pr-\[30px\]/);
    expect(liste).toMatch(/PhoneSokFelt/);
    expect(liste).toMatch(/Nyeste/);
    expect(liste).toMatch(/Eldste/);
    expect(liste).toMatch(/SorteringArk/);
    expect(liste).toMatch(/NyKunde/);
    expect(liste).toMatch(/RegistrerKjoretoy/);
    expect(liste).not.toMatch(/custTrash|Slett kunde/);
  });

  it('alfa-filter og 25-pager er ærlig klient-slice', () => {
    expect(KUNDER_SIDE_STORRELSE).toBe(25);
    expect(kundeAlfaBokstav('Åse Vik')).toBe('Å');
    expect(kundeAlfaBokstav('øystein')).toBe('Ø');
    const liste = [{ name: 'Anne' }, { name: 'Bjørn' }, { name: 'Åse' }, { name: 'Øyvind' }];
    expect(filtrerKunderAlfa(liste, 'A').map((k) => k.name)).toEqual(['Anne']);
    expect(filtrerKunderAlfa(liste, '#').length).toBe(4);
    expect(filtrerKunderAlfa(liste, 'Ø').map((k) => k.name)).toEqual(['Øyvind']);
    const mange = Array.from({ length: 26 }, (_, i) => ({ name: `K${i}` }));
    expect(kunderSide(mange, 0)).toHaveLength(25);
    expect(kunderSide(mange, 1)).toHaveLength(1);
    expect(kunderSideEtikett(26, 0)).toBe('Viser 1–25 av 26');
    expect(kunderSideEtikett(26, 1)).toBe('Viser 26–26 av 26');
    const api = les('../../../apps/api/src/trpc/routers/customers.ts');
    expect(api).toMatch(/list: staffProcedure/);
    expect(api).not.toMatch(/delete: staffProcedure/);
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
