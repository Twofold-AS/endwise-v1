import { afterEach, describe, expect, it, vi } from 'vitest';
import { createQuickClient, mapQuickClientInfo } from '../src/index.ts';
import { foldQuickJsonKeys, parseQuickClientInfo, quickClientInfo } from '../src/schema.ts';

/**
 * F8-01 — client/info → forhandler. Skjemaet krever ingen ubrukte nøkler.
 * Live Yamaha-body er ikke logget (gateway logger aldri body). Vi mapper
 * bare nøkler som finnes etter fold og som har org-kolonne.
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

  it('camelCase name er identitet', () => {
    expect(parseQuickClientInfo({ name: 'Yamaha Bergen AS' }).name).toBe('Yamaha Bergen AS');
  });
});

describe('mapQuickClientInfo — 1:1 mot eksisterende org-kolonner', () => {
  it('camel name → forhandlernavn', () => {
    const mapped = mapQuickClientInfo({ name: 'Yamaha Bergen AS' });
    expect(mapped).toEqual({ name: 'Yamaha Bergen AS', mappedKeys: ['name'] });
  });

  it('Pascal Name (via parse) → forhandlernavn', () => {
    const mapped = mapQuickClientInfo(parseQuickClientInfo({ Name: 'Yamaha Motor Center' }));
    expect(mapped.name).toBe('Yamaha Motor Center');
    expect(mapped.mappedKeys).toEqual(['name']);
  });

  it('company (bekreftet Quick-firmanavn) brukes bare hvis name mangler', () => {
    expect(mapQuickClientInfo(parseQuickClientInfo({ Company: 'Bergen MC AS' }))).toEqual({
      name: 'Bergen MC AS',
      mappedKeys: ['company'],
    });
    expect(
      mapQuickClientInfo(parseQuickClientInfo({ Name: 'A', Company: 'B' })).mappedKeys,
    ).toEqual(['name']);
    expect(mapQuickClientInfo(parseQuickClientInfo({ Name: 'A', Company: 'B' })).name).toBe('A');
  });

  it('tom/blank Quick-verdi overskriver ikke', () => {
    expect(mapQuickClientInfo({ name: '' })).toEqual({ name: null, mappedKeys: [] });
    expect(mapQuickClientInfo({ name: '   ' })).toEqual({ name: null, mappedKeys: [] });
    expect(mapQuickClientInfo({})).toEqual({ name: null, mappedKeys: [] });
  });

  it('mapper ikke slug — ingen stabil Quick-slug uten å knekke /endwise/verksted/[slug]', () => {
    const mapped = mapQuickClientInfo(
      parseQuickClientInfo({ Name: 'Yamaha Bergen AS', Guid: 'cli-1', Slug: 'yamaha-bergen' }),
    );
    expect(mapped).not.toHaveProperty('slug');
    expect(JSON.stringify(mapped)).not.toMatch(/slug/i);
    expect(mapped.name).toBe('Yamaha Bergen AS');
  });
});

describe('createQuickClient.clientInfo — returnerer parset Client, ikke {}', () => {
  it('200 med Name gir mapped forhandlernavn', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ Name: 'Yamaha Bergen AS' }));
    const info = await createQuickClient(cfg).clientInfo();
    expect(mapQuickClientInfo(info).name).toBe('Yamaha Bergen AS');
  });
});
