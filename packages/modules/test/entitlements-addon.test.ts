import { describe, expect, it } from 'vitest';
import {
  ADDON_MODULES,
  addonKatalog,
  BASIS_MODULES,
  erTildelbarAddon,
  filtrerAddonNokler,
  isAddon,
} from '../src/entitlements.ts';

describe('F0-16 / F5-26 — tillegg vs. basis', () => {
  it('basis-nøkler er ikke tildelbare tillegg', () => {
    for (const b of BASIS_MODULES) {
      expect(erTildelbarAddon(b)).toBe(false);
      expect(isAddon(b)).toBe(false);
    }
  });

  it('filtrerAddonNokler dropper basis og ukjente', () => {
    expect(filtrerAddonNokler(['booking', 'quick', 'finnes-ikke', 'shop'])).toEqual([
      'quick',
      'shop',
    ]);
  });

  it('katalogen har bare ADDON-nøkler og norske etiketter', () => {
    const kat = addonKatalog();
    expect(kat.map((k) => k.key)).toEqual([...ADDON_MODULES]);
    expect(kat.every((k) => k.label.length > 0)).toBe(true);
    expect(kat.some((k) => k.key === 'ai-support')).toBe(true);
    expect(kat.some((k) => k.key === 'booking')).toBe(false);
  });
});
