import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { applyQuickOnHand, stockFromItemOnHand } from '../src/quick/sync-parts.ts';

describe('applyQuickOnHand — Quick vinner onHand, reserved clamps', () => {
  it('setter onHand fra Quick uten å røre reserved når det er plass', () => {
    const r = applyQuickOnHand(10, 3, 8);
    expect(r).toEqual({ onHand: 8, reserved: 3, changed: true });
  });

  it('clamps reserved når Quick senker onHand under reserved', () => {
    const r = applyQuickOnHand(10, 8, 5);
    expect(r.onHand).toBe(5);
    expect(r.reserved).toBe(5);
    expect(r.changed).toBe(true);
  });

  it('ingen bevegelse når tallene er uendret', () => {
    expect(applyQuickOnHand(4, 1, 4).changed).toBe(false);
  });

  it('avviser negativ beholdning', () => {
    expect(applyQuickOnHand(0, 0, -3).onHand).toBe(0);
  });
});

describe('stockFromItemOnHand — fallback uten stockentry', () => {
  it('lager default-lokasjon når varen har inStock', () => {
    const s = stockFromItemOnHand({
      quickGuid: 'g1',
      sku: 'A',
      name: 'A',
      unit: 'stk',
      costMinor: null,
      active: true,
      onHand: 7,
    });
    expect(s).toEqual({
      itemQuickGuid: 'g1',
      onHand: 7,
      locationQuickGuid: null,
      locationCode: 'QUICK',
      locationName: 'Quick',
    });
  });

  it('hopper over varer uten onHand', () => {
    expect(
      stockFromItemOnHand({
        quickGuid: 'g1',
        sku: 'A',
        name: 'A',
        unit: 'stk',
        costMinor: null,
        active: true,
        onHand: null,
      }),
    ).toBeNull();
  });
});

describe('syncQuickParts skriver ikke utsalg uten Quick-felt', () => {
  it('sku/name/unit/costMinor — ikke sellPriceMinor', () => {
    const her = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(her, '../src/quick/sync-parts.ts'), 'utf8');
    expect(src).toMatch(/costMinor: r\.costMinor/);
    expect(src).not.toMatch(/sellPriceMinor:/);
  });
});
