import { describe, expect, it } from 'vitest';
import {
  ADDON_MODULES,
  addonKatalog,
  BASIS_MODULES,
  erBlokertTildeling,
  erTildelbarAddon,
  filtrerAddonNokler,
  IKKE_TILDELBARE_ADDON,
  isAddon,
} from '../src/entitlements.ts';

describe('F0-16 / F5-26 — tillegg vs. basis', () => {
  it('basis-nøkler er ikke tildelbare tillegg', () => {
    for (const b of BASIS_MODULES) {
      expect(erTildelbarAddon(b)).toBe(false);
      expect(isAddon(b)).toBe(false);
    }
  });

  it('shop er blokkert; SMS (twilio) er tildelbart tillegg', () => {
    expect(ADDON_MODULES).toContain('shop');
    expect(ADDON_MODULES).toContain('twilio');
    expect(IKKE_TILDELBARE_ADDON).toEqual(['shop']);
    expect(erTildelbarAddon('shop')).toBe(false);
    expect(erTildelbarAddon('twilio')).toBe(true);
    expect(erBlokertTildeling('shop')).toBe(true);
    expect(erBlokertTildeling('twilio')).toBe(false);
    expect(erTildelbarAddon('ai-support')).toBe(true);
    expect(erTildelbarAddon('vegvesen')).toBe(true);
  });

  it('filtrerAddonNokler dropper basis, ukjente og shop — beholder SMS', () => {
    expect(
      filtrerAddonNokler(['booking', 'quick', 'finnes-ikke', 'shop', 'twilio', 'vegvesen']),
    ).toEqual(['quick', 'twilio', 'vegvesen']);
  });

  it('katalogen er ADDON minus shop, med norske etiketter', () => {
    const kat = addonKatalog();
    const keys = kat.map((k) => k.key);
    expect(keys).not.toContain('shop');
    expect(keys).toContain('twilio');
    expect(keys).not.toContain('booking');
    expect(keys).toContain('ai-support');
    expect(keys).toContain('vegvesen');
    expect(keys).toContain('quick');
    expect(keys.every((k) => ADDON_MODULES.includes(k))).toBe(true);
    expect(kat.every((k) => k.label.length > 0)).toBe(true);
    expect(kat.some((k) => k.label === 'SMS')).toBe(true);
    expect(kat.some((k) => k.label === 'Nettbutikk')).toBe(false);
  });
});
