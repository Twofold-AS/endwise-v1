import { describe, expect, it } from 'vitest';
import { buildDealerProfileWrite } from '../src/quick/dealer-profile.ts';

/**
 * F8-01 — Client-info på denne tenantens forhandler.
 * Kolonner som FINNES: tenants.name / organization.name, tenants.slug / organization.slug.
 * Ingen adresse/orgnr/nettside-kolonner på organizations/tenants — ikke funnet opp.
 */

const dealer = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Gammelt navn',
  slug: 'yamaha-bergen',
  kind: 'live' as const,
};

describe('buildDealerProfileWrite — eksisterende org-kolonner', () => {
  it('camel/Pascal-mappet name skriver tenants.name + organization.name', () => {
    const write = buildDealerProfileWrite(dealer, {
      name: 'Yamaha Bergen AS',
      mappedKeys: ['name'],
    });
    expect(write.skipReason).toBeUndefined();
    expect(write.tenants).toEqual({ name: 'Yamaha Bergen AS' });
    expect(write.organization).toEqual({ name: 'Yamaha Bergen AS' });
  });

  it('slug skrives aldri — unik + /endwise/verksted/[slug]', () => {
    const write = buildDealerProfileWrite(dealer, {
      name: 'Yamaha Bergen AS',
      mappedKeys: ['name'],
    });
    expect(write.tenants).not.toHaveProperty('slug');
    expect(write.organization).not.toHaveProperty('slug');
    expect(JSON.stringify(write)).not.toMatch(/slug/);
  });

  it('tom Quick-verdi skriver ikke blankt over eksisterende navn', () => {
    const write = buildDealerProfileWrite(dealer, { name: null, mappedKeys: [] });
    expect(write.tenants).toEqual({});
    expect(write.organization).toEqual({});
  });

  it('plattform-org (slug endwise / kind=platform) røres ikke', () => {
    const endwise = {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Endwise',
      slug: 'endwise',
      kind: 'platform' as const,
    };
    const write = buildDealerProfileWrite(endwise, {
      name: 'Hacket navn',
      mappedKeys: ['name'],
    });
    expect(write.skipReason).toBe('platform');
    expect(write.tenants).toEqual({});
    expect(write.organization).toEqual({});

    const kindOnly = buildDealerProfileWrite(
      { ...endwise, slug: 'annet', kind: 'platform' },
      { name: 'Hacket navn', mappedKeys: ['name'] },
    );
    expect(kindOnly.skipReason).toBe('platform');
  });

  it('finner ikke opp adresse/orgnr/nettside-kolonner', () => {
    const write = buildDealerProfileWrite(dealer, {
      name: 'Yamaha Bergen AS',
      mappedKeys: ['name'],
    });
    const json = JSON.stringify(write);
    expect(json).not.toMatch(/orgnr|postnr|poststed|adresse|website|nettside|telefon|email/i);
  });
});
