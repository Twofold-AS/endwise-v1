import { describe, expect, it } from 'vitest';
import {
  ENDWISE_SLUG,
  erEndwiseSlug,
  erGyldigEkstraTillegg,
  erTierKey,
  pakkeKatalog,
  TIERS,
  TILLEGG,
  tilgjengeligeTilleggForNivaa,
  utvidPakke,
} from '../src/billing/plans.ts';

describe('F5-26 — pakkemodell (nivå + TILLEGG)', () => {
  it('nivåprisene er urørt', () => {
    expect(TIERS.map((t) => t.priceMonthlyMinor)).toEqual([449_000, 849_000, 1_249_000]);
    expect(TIERS.map((t) => t.key)).toEqual(['start', 'pro', 'enterprise']);
  });

  it('erEndwiseSlug treffer bare slug endwise', () => {
    expect(ENDWISE_SLUG).toBe('endwise');
    expect(erEndwiseSlug('endwise')).toBe(true);
    expect(erEndwiseSlug('Endwise')).toBe(false);
    expect(erEndwiseSlug('endwise-as')).toBe(false);
    expect(erTierKey('start')).toBe(true);
    expect(erTierKey('endwise')).toBe(false);
  });

  it('tilgjengelige tillegg utelater included-tier-moduler, shop og twilio', () => {
    const start = tilgjengeligeTilleggForNivaa('start');
    const pro = tilgjengeligeTilleggForNivaa('pro');
    const keys = (liste: typeof start) => liste.map((t) => t.key);

    expect(keys(start)).not.toContain('shop');
    expect(keys(pro)).not.toContain('shop');
    expect(start.some((t) => t.module === 'twilio')).toBe(false);
    expect(pro.some((t) => t.module === 'twilio')).toBe(false);
    expect(TILLEGG.some((t) => t.status === 'coming' && keys(start).includes(t.key))).toBe(false);
    expect(TILLEGG.some((t) => t.status === 'blocked' && keys(start).includes(t.key))).toBe(false);

    const proModuler = new Set(TIERS.find((t) => t.key === 'pro')?.modules ?? []);
    expect(pro.every((t) => !proModuler.has(t.module))).toBe(true);

    expect(erGyldigEkstraTillegg('shop', 'start')).toBeUndefined();
    expect(erGyldigEkstraTillegg('twilio', 'pro')).toBeUndefined();
    expect(erGyldigEkstraTillegg('white-label', 'start')?.module).toBe('white-label');
  });

  it('veiviser-extras utelater included-tier-moduler og shop/twilio', () => {
    const { included, optional, tier } = utvidPakke(
      'pro',
      ['white-label'],
      ['white-label', 'sso', 'shop', 'twilio', 'rapporter'],
    );

    expect(tier.key).toBe('pro');
    expect(included).toContain('twilio');
    expect(included).toContain('white-label');
    expect(included).not.toContain('shop');
    expect(optional).toEqual(['sso']);
    expect(optional).not.toContain('shop');
    expect(optional).not.toContain('twilio');
    expect(optional).not.toContain('white-label');
    expect(optional).not.toContain('ai-support');
    expect(optional).not.toContain('quick');
  });

  it('Start-pakken skriver widget/resend, ikke shop/twilio', () => {
    const { included, optional } = utvidPakke('start', [], ['nyhetsbrev', 'shop']);
    expect(included).toEqual(['widget', 'resend']);
    expect(included).not.toContain('twilio');
    expect(optional).toEqual(['nyhetsbrev']);
  });

  it('pakkeKatalog skjuler coming/blocked og shop', () => {
    const kat = pakkeKatalog();
    expect(kat.nivaa.map((n) => n.key)).toEqual(['start', 'pro', 'enterprise']);
    expect(kat.nivaa[0]?.priceMonthlyMinor).toBe(449_000);
    expect(kat.tillegg.map((t) => t.key)).not.toContain('shop');
    expect(kat.tillegg.map((t) => t.module)).not.toContain('twilio');
    expect(
      kat.tillegg.every((t) => TILLEGG.find((x) => x.key === t.key)?.status === 'available'),
    ).toBe(true);
  });
});
