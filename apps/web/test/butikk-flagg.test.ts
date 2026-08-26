import { describe, expect, it } from 'vitest';
import { FLAG_DEFAULTS, FLAG_KEYS } from '../flags.ts';
import {
  BUTIKK_NAV,
  CONTEXTS,
  contextsForRole,
  navForContext,
} from '../app/(app)/_shell/nav.ts';

/**
 * F10-03 — Butikk er intern og flagg-styrt. Nav er kosmetikk; tRPC er sperren.
 */
describe('F10-03 — Butikk-nav bak shop-flagget', () => {
  it('flagget shop er kjent og default AV', () => {
    expect(FLAG_KEYS).toContain('shop');
    expect(FLAG_DEFAULTS.shop).toBe(false);
  });

  it('flagg av: dealer_admin ser ikke Butikk i visningsvelgeren', () => {
    const uten = contextsForRole('dealer_admin', false, false, false);
    expect(uten.some((c) => c.key === 'butikk')).toBe(false);
    expect(uten.map((c) => c.label)).not.toContain('Kontor');
    expect(uten.map((c) => c.label)).not.toContain('Gulvet');
  });

  it('flagg på: dealer_admin ser Butikk med Katalog og Handlekurv / kasse', () => {
    const med = contextsForRole('dealer_admin', false, false, true);
    expect(med.some((c) => c.key === 'butikk')).toBe(true);
    expect(navForContext('butikk').map((i) => i.label)).toEqual(['Katalog', 'Handlekurv / kasse']);
    expect(BUTIKK_NAV.map((i) => i.href)).toEqual(['/butikk', '/butikk/kasse']);
  });

  it('Butikk krever shop-flagg, ikke dev-mode', () => {
    const butikk = CONTEXTS.find((c) => c.key === 'butikk');
    expect(butikk?.requiresShopFlag).toBe(true);
    expect(butikk?.requiresDevMode).toBeFalsy();
    expect(butikk?.label).toBe('Butikk');
    expect(contextsForRole('dealer_admin', false, true, false).some((c) => c.key === 'butikk')).toBe(
      false,
    );
  });
});
