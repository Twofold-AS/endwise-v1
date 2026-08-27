import { afterEach, describe, expect, it, vi } from 'vitest';
import { createQuickClient, mapQuickClientInfo } from '../src/index.ts';
import { foldQuickJsonKeys, parseQuickClientInfo, quickClientInfo } from '../src/schema.ts';

/**
 * F8-01 — client/info → forhandler. Skjemaet krever ingen ubrukte nøkler.
 * Mapper bare nøkler som finnes etter fold.
 */

const cfg = { baseUrl: 'https://q3.quick.no/Test_Public', token: 'tkn' };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => vi.restoreAllMocks());

describe('quickClientInfo — strammet, ingen påkrevde felt', () => {
  it('tomt objekt (dagens probe-suksess) passerer fortsatt', () => {
    expect(quickClientInfo.parse({})).toEqual({});
    expect(parseQuickClientInfo({})).toEqual({});
  });

  it('krever ikke guid/slug/adresse — ubrukte nøkler er ikke påkrevd', () => {
    expect(() => parseQuickClientInfo({ foo: 1 })).not.toThrow();
    expect(() => parseQuickClientInfo({ Name: 'Yamaha Bergen AS' })).not.toThrow();
  });

  it('PascalCase Name folder til name', () => {
    expect(foldQuickJsonKeys({ Name: 'Yamaha Bergen AS' })).toEqual({ name: 'Yamaha Bergen AS' });
    expect(parseQuickClientInfo({ Name: 'Yamaha Bergen AS' }).name).toBe('Yamaha Bergen AS');
  });
});

describe('mapQuickClientInfo — nøkler når de finnes', () => {
  it('camel name → firmanavn', () => {
    const mapped = mapQuickClientInfo({ name: 'Yamaha Bergen AS' });
    expect(mapped.name).toBe('Yamaha Bergen AS');
    expect(mapped.mappedKeys).toEqual(['name']);
  });

  it('company brukes bare hvis name mangler', () => {
    expect(mapQuickClientInfo(parseQuickClientInfo({ Company: 'Bergen MC AS' }))).toMatchObject({
      name: 'Bergen MC AS',
      mappedKeys: ['company'],
    });
    expect(mapQuickClientInfo(parseQuickClientInfo({ Name: 'A', Company: 'B' })).name).toBe('A');
  });

  it('adresse/postnr/poststed mappes når nøklene finnes', () => {
    const mapped = mapQuickClientInfo(
      parseQuickClientInfo({
        Name: 'Yamaha Bergen AS',
        Address: 'Gate 1',
        ZipCode: '5003',
        City: 'Bergen',
      }),
    );
    expect(mapped.address).toBe('Gate 1');
    expect(mapped.postalCode).toBe('5003');
    expect(mapped.city).toBe('Bergen');
    expect(mapped.mappedKeys).toEqual(
      expect.arrayContaining(['name', 'address', 'zipCode', 'city']),
    );
  });

  it('tom/blank Quick-verdi overskriver ikke', () => {
    expect(mapQuickClientInfo({ name: '' })).toMatchObject({ name: null, mappedKeys: [] });
    expect(mapQuickClientInfo({ name: '   ', address: '  ' })).toMatchObject({
      name: null,
      address: null,
    });
  });

  it('mapper ikke slug til kolonne', () => {
    const mapped = mapQuickClientInfo(
      parseQuickClientInfo({ Name: 'Yamaha Bergen AS', Slug: 'yamaha-bergen' }),
    );
    expect(mapped).not.toHaveProperty('slug');
    expect(mapped.name).toBe('Yamaha Bergen AS');
    expect(mapped.leftover.slug).toBe('yamaha-bergen');
  });

  it('ukjente nøkler lander i leftover — ingen Yamaha-kategorinavn hardkodet', () => {
    const mapped = mapQuickClientInfo(
      parseQuickClientInfo({ Name: 'A', Guid: 'cli-1', SomeNewField: 'x' }),
    );
    expect(mapped.leftover.guid).toBe('cli-1');
    expect(mapped.leftover.someNewField).toBe('x');
    expect(JSON.stringify(mapped)).not.toMatch(/sellPrice|Resource/i);
  });
});

describe('createQuickClient.clientInfo — returnerer parset Client', () => {
  it('200 med Name gir mapped firmanavn', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ Name: 'Yamaha Bergen AS' }));
    const info = await createQuickClient(cfg).clientInfo();
    expect(mapQuickClientInfo(info).name).toBe('Yamaha Bergen AS');
  });
});
