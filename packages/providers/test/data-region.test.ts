import { describe, expect, it } from 'vitest';
import {
  assertEuEndpoint,
  createFireworksProvider,
  createMistralProvider,
  createMockProvider,
  DataRegionViolation,
  MISTRAL_EU_BASE_URL,
  MissingEuProviderError,
  NonEuEndpointError,
  providerSatisfies,
  regionFromMistralUrl,
  regionSatisfies,
  resolveModelProvider,
} from '../src/index.ts';

/** F14 — Rutingregelen. Den er kode, ikke dokumentasjon. */
describe('dataregion (F14)', () => {
  it('EU-provider kan betjene begge dataklasser', () => {
    expect(regionSatisfies('eu', 'customer_freetext')).toBe(true);
    expect(regionSatisfies('eu', 'tenant_operational')).toBe(true);
  });

  it('ANGREP: global provider kan IKKE betjene noen dataklasse', () => {
    expect(regionSatisfies('global', 'customer_freetext')).toBe(false);
    expect(regionSatisfies('global', 'tenant_operational')).toBe(false);
  });

  it('Fireworks erklærer seg global og får derfor ingen dataklasse', () => {
    const fw = createFireworksProvider({ apiKey: 'x' });
    const mi = createMistralProvider({ apiKey: 'x' });
    expect(fw.region).toBe('global');
    expect(mi.region).toBe('eu');
    expect(providerSatisfies(fw, 'customer_freetext')).toBe(false);
    expect(providerSatisfies(fw, 'tenant_operational')).toBe(false);
    expect(providerSatisfies(mi, 'customer_freetext')).toBe(true);
    expect(providerSatisfies(mi, 'tenant_operational')).toBe(true);
  });

  it('mock er trygg for alt (den går ingen steder)', () => {
    expect(providerSatisfies(createMockProvider(), 'customer_freetext')).toBe(true);
  });

  it('DataRegionViolation sier tydelig hva som er galt', () => {
    const error = new DataRegionViolation(
      'kunde-support',
      'customer_freetext',
      'fireworks',
      'global',
    );
    expect(error.message).toContain('personvernbrudd');
    expect(error.message).toContain('kunde-support');
  });
});

describe('Mistral EU-endepunkt (F14-02)', () => {
  it('kun det regionale EU-endepunktet godtas', () => {
    expect(() => assertEuEndpoint(MISTRAL_EU_BASE_URL)).not.toThrow();
    expect(() => assertEuEndpoint('https://api.eu.mistral.ai/v1')).not.toThrow();
    expect(regionFromMistralUrl(MISTRAL_EU_BASE_URL)).toBe('eu');
  });

  it('ANGREP: globalt endepunkt (api.mistral.ai) avvises', () => {
    expect(() => assertEuEndpoint('https://api.mistral.ai/v1')).toThrow(NonEuEndpointError);
  });

  it('ANGREP: US-endepunktet avvises', () => {
    expect(() => assertEuEndpoint('https://api.us.mistral.ai/v1')).toThrow(NonEuEndpointError);
  });

  it('ANGREP: vilkårlig MISTRAL_BASE_URL-override avvises', () => {
    expect(() => assertEuEndpoint('https://evil.example/v1')).toThrow(NonEuEndpointError);
    expect(() => assertEuEndpoint('https://api.mistral.ai.evil.example/v1')).toThrow(
      NonEuEndpointError,
    );
  });

  it('søppel-URL avvises', () => {
    expect(() => assertEuEndpoint('ikke-en-url')).toThrow(NonEuEndpointError);
  });

  it('provideren nekter å bli OPPRETTET med feil endepunkt', () => {
    expect(() =>
      createMistralProvider({ apiKey: 'x', baseUrl: 'https://api.us.mistral.ai/v1' }),
    ).toThrow(NonEuEndpointError);
    expect(() =>
      createMistralProvider({ apiKey: 'x', baseUrl: 'https://api.mistral.ai/v1' }),
    ).toThrow(NonEuEndpointError);
  });

  it('region utledes fra URL, ikke hardkodes i provideren', () => {
    const mi = createMistralProvider({ apiKey: 'x', baseUrl: MISTRAL_EU_BASE_URL });
    expect(mi.region).toBe(regionFromMistralUrl(MISTRAL_EU_BASE_URL));
    expect(mi.region).toBe('eu');
  });
});

describe('resolveModelProvider ruter begge dataklasser til Mistral', () => {
  it('fritekst uten Mistral-nøkkel i PRODUKSJON = feil, ikke fallback til Fireworks', () => {
    expect(() =>
      resolveModelProvider('customer_freetext', {
        NODE_ENV: 'production',
        FIREWORKS_API_KEY: 'har-denne',
      } as NodeJS.ProcessEnv),
    ).toThrow(MissingEuProviderError);
  });

  it('fritekst med Mistral-nøkkel → Mistral', () => {
    const p = resolveModelProvider('customer_freetext', {
      MISTRAL_API_KEY: 'x',
    } as NodeJS.ProcessEnv);
    expect(p.name).toBe('mistral');
  });

  it('intern (Ronny/drift) med Mistral-nøkkel → Mistral, ikke Fireworks', () => {
    const p = resolveModelProvider('tenant_operational', {
      MISTRAL_API_KEY: 'x',
      FIREWORKS_API_KEY: 'også-denne',
    } as NodeJS.ProcessEnv);
    expect(p.name).toBe('mistral');
  });

  it('intern uten Mistral-nøkkel i PRODUKSJON = feil, selv med Fireworks-nøkkel', () => {
    expect(() =>
      resolveModelProvider('tenant_operational', {
        NODE_ENV: 'production',
        FIREWORKS_API_KEY: 'har-denne',
      } as NodeJS.ProcessEnv),
    ).toThrow(MissingEuProviderError);
  });

  it('uten nøkler (dev) → mock for begge klasser, aldri Fireworks', () => {
    expect(resolveModelProvider('customer_freetext', {} as NodeJS.ProcessEnv).name).toBe('mock');
    expect(resolveModelProvider('tenant_operational', {} as NodeJS.ProcessEnv).name).toBe('mock');
  });
});
