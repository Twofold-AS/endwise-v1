import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FORHANDLER_NAV } from '../app/(app)/_shell/nav.ts';
import { DEALER_PULSE_KEYS } from '../app/(app)/_shell/phone-home.ts';
import { TIMEPLAN_FANER } from '../app/(app)/jobber/_faner.ts';
import {
  belowMin,
  butikkPageSub,
  INGEN_API,
  LAGER_HUB_SEKSJONER,
  LAGER_STAT_LABELS,
  lagerPageSub,
  SALG_KANALER,
} from '../app/(app)/lager/_hub.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Claude Design BIT 6 — Lager + Butikk', () => {
  it('chrome Lager/Butikk-piller og Bit 1–5-låser er urørt', () => {
    const lager = FORHANDLER_NAV.find((i) => i.key === 'lager');
    expect(lager?.pills?.map((p) => p.label)).toEqual(['Oversikt', 'Deler', 'Plass', 'Inn og ut']);
    const butikk = FORHANDLER_NAV.find((i) => i.key === 'butikk');
    expect(butikk?.pills?.map((p) => p.label)).toEqual(['Katalog', 'Handlekurv / kasse']);
    expect(lager?.pills?.some((p) => p.label === 'Bestill deler')).toBe(false);
    expect(TIMEPLAN_FANER.map((f) => f.label)).toEqual(['Timeplan', 'Opprett jobb', 'Endringer']);
    expect([...DEALER_PULSE_KEYS]).toEqual([
      'idag',
      'innboks',
      'lager',
      'analyser',
      'team',
      'jobb',
    ]);
    const ny = utenKommentarer(les('../app/(app)/bookinger/ny/page.tsx'));
    expect(ny).toMatch(/bookings\.create/);
    expect(ny).toMatch(/data-jobb-wizard/);
  });

  it('jobSlots-regler og lager-stats: belowMin uten oppdiktet ordered', () => {
    expect([...LAGER_STAT_LABELS]).toEqual([
      'På lager',
      'Tilgjengelig',
      'Reservert',
      'Under minimum',
    ]);
    expect(lagerPageSub(10)).toBe('10 delenummer');
    expect(butikkPageSub(3, 0)).toBe('3 varer · 0 kjøretøy');
    expect(belowMin({ onHand: 4, reserved: 2, minStock: 3, ordered: 0 })).toBe(true);
    expect(belowMin({ onHand: 4, reserved: 2, minStock: 3, ordered: 2 })).toBe(false);
    expect(belowMin({ onHand: 5, reserved: 0, minStock: null })).toBe(false);
    expect(LAGER_HUB_SEKSJONER.map((s) => s.label)).toEqual([
      'Deler',
      'Inn- og utlogg',
      'Bestill deler',
      'Kjøretøy til salgs',
    ]);
    expect([...SALG_KANALER]).toEqual(['Finn.no', 'Butikk', 'Reservert']);
    expect(INGEN_API).toBe('ingen API');
  });

  it('hubber bruker ekte inventory/shop og ærlig stub uten Hellanor-live', () => {
    const hub = utenKommentarer(les('../app/(app)/lager/page.tsx'));
    expect(hub).toMatch(/inventory\.summary/);
    expect(hub).toMatch(/data-lager-hub/);
    expect(hub).toMatch(/LAGER_HUB_SEKSJONER/);
    const deler = utenKommentarer(les('../app/(app)/lager/deler/page.tsx'));
    expect(deler).toMatch(/inventory\.listParts/);
    expect(deler).toMatch(/NyDel/);
    expect(deler).toMatch(/DelDetalj/);
    expect(utenKommentarer(les('../app/(app)/lager/deler/_ny-del.tsx'))).toMatch(
      /inventory\.createPart/,
    );
    const logg = utenKommentarer(les('../app/(app)/lager/bevegelser/page.tsx'));
    expect(logg).toMatch(/inventory\.listMovements/);
    expect(logg).toMatch(/Siste bevegelser/);
    const bestill = utenKommentarer(les('../app/(app)/lager/bestill/page.tsx'));
    expect(bestill).toMatch(/INGEN_API/);
    expect(bestill).toMatch(/ikke koblet/);
    expect(bestill).not.toMatch(/inventory\.order|createOrder/);
    const salg = utenKommentarer(les('../app/(app)/lager/_kjoretoy-salg.tsx'));
    expect(salg).toMatch(/INGEN_API/);
    expect(salg).not.toMatch(/Yamaha MT-09|Hellanor/);
    const butikk = utenKommentarer(les('../app/(app)/butikk/page.tsx'));
    expect(butikk).toMatch(/shop\.catalog/);
    expect(butikk).toMatch(/data-butikk-hub/);
    expect(butikk).toMatch(/Se alle varer|varerPreview/);
    expect(butikk).toMatch(/ButikkBookingWidget/);
    expect(butikk).toMatch(/leggIKurv/);
    const previewL = utenKommentarer(les('../app/lager-preview/page.tsx'));
    const previewB = utenKommentarer(les('../app/butikk-preview/page.tsx'));
    expect(previewL).toMatch(/data-lager-preview/);
    expect(previewB).toMatch(/data-butikk-preview/);
  });
});
