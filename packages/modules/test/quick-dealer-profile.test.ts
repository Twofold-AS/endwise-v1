import { describe, expect, it } from 'vitest';
import { buildDealerProfileWrite, leftoverBagWrite } from '../src/quick/dealer-profile.ts';

const dealer = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Gammelt navn',
  slug: 'yamaha-bergen',
  kind: 'live' as const,
};

const tomPatch = {
  name: null,
  orgnr: null,
  address: null,
  postalCode: null,
  city: null,
  phone: null,
  email: null,
  website: null,
  leftover: {},
  mappedKeys: [] as const,
};

describe('buildDealerProfileWrite — forhandler-kolonner', () => {
  it('name skriver tenants.name + organization.name', () => {
    const write = buildDealerProfileWrite(dealer, {
      ...tomPatch,
      name: 'Yamaha Bergen AS',
      mappedKeys: ['name'],
    });
    expect(write.skipReason).toBeUndefined();
    expect(write.tenants).toEqual({ name: 'Yamaha Bergen AS' });
    expect(write.organization).toEqual({ name: 'Yamaha Bergen AS' });
  });

  it('adresse mappes når nøkkelen er satt', () => {
    const write = buildDealerProfileWrite(dealer, {
      ...tomPatch,
      address: 'Gate 1',
      postalCode: '5003',
      city: 'Bergen',
      mappedKeys: ['address', 'zipCode', 'city'],
    });
    expect(write.profile).toEqual({
      address: 'Gate 1',
      postalCode: '5003',
      city: 'Bergen',
    });
  });

  it('slug skrives aldri', () => {
    const write = buildDealerProfileWrite(dealer, {
      ...tomPatch,
      name: 'Yamaha Bergen AS',
      leftover: { slug: 'fra-quick' },
      mappedKeys: ['name'],
    });
    expect(write.tenants).not.toHaveProperty('slug');
    expect(write.organization).not.toHaveProperty('slug');
    expect(write.profile).not.toHaveProperty('slug');
  });

  it('tom Quick-verdi skriver ikke blankt over', () => {
    const write = buildDealerProfileWrite(dealer, tomPatch);
    expect(write.skipReason).toBe('empty');
    expect(write.tenants).toEqual({});
    expect(write.profile).toEqual({});
  });

  it('tom leftover tømmer ikke eksisterende bag', () => {
    const write = buildDealerProfileWrite(dealer, {
      ...tomPatch,
      address: 'Gate 1',
    });
    expect(write.profile.address).toBe('Gate 1');
    expect(leftoverBagWrite(write.leftover)).toBeNull();
    expect(leftoverBagWrite({ guid: 'cli-1' })).toEqual({ guid: 'cli-1' });
  });

  it('plattform-org røres ikke', () => {
    const endwise = { slug: 'endwise', kind: 'platform' as const };
    const write = buildDealerProfileWrite(endwise, {
      ...tomPatch,
      name: 'Hacket navn',
      mappedKeys: ['name'],
    });
    expect(write.skipReason).toBe('platform');
    expect(write.tenants).toEqual({});
  });
});
