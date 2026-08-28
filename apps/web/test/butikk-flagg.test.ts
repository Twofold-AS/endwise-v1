import { describe, expect, it } from 'vitest';
import { FORHANDLER_NAV, itemsForRole } from '../app/(app)/_shell/nav.ts';
import { FLAG_DEFAULTS, FLAG_KEYS } from '../flags.ts';

/**
 * Butikk er intern og flagg-styrt. Nav er kosmetikk; tRPC er sperren.
 */
describe('F10-03 — Butikk-nav bak shop-flagget', () => {
  it('flagget shop er kjent og default AV', () => {
    expect(FLAG_KEYS).toContain('shop');
    expect(FLAG_DEFAULTS.shop).toBe(false);
  });

  it('flagg av: dealer_admin ser ikke Butikk-raden', () => {
    expect(
      itemsForRole(FORHANDLER_NAV, 'dealer_admin', false).some((i) => i.key === 'butikk'),
    ).toBe(false);
  });

  it('flagg på: dealer_admin ser Butikk med Katalog og Handlekurv / kasse', () => {
    const butikk = itemsForRole(FORHANDLER_NAV, 'dealer_admin', true).find(
      (i) => i.key === 'butikk',
    );
    expect(butikk?.pills?.map((p) => p.label)).toEqual(['Katalog', 'Handlekurv / kasse']);
    expect(butikk?.pills?.map((p) => p.href)).toEqual(['/butikk', '/butikk/kasse']);
  });

  it('Butikk krever shop-flagg', () => {
    const butikk = FORHANDLER_NAV.find((i) => i.key === 'butikk');
    expect(butikk?.requiresShopFlag).toBe(true);
    expect(butikk?.label).toBe('Butikk');
  });
});
