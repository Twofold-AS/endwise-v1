import { describe, expect, it } from 'vitest';
import {
  assertEuEndpoint,
  createFireworksProvider,
  createMistralProvider,
  createMockProvider,
  DataRegionViolation,
  MissingEuProviderError,
  NonEuEndpointError,
  providerSatisfies,
  regionSatisfies,
  resolveModelProvider,
} from '../src/index.ts';

/** F14 — Rutingregelen. Den er kode, ikke dokumentasjon. */
describe('dataregion (F14)', () => {
  it('EU-provider kan betjene begge dataklasser', () => {
    expect(regionSatisfies('eu', 'customer_freetext')).toBe(true);
    expect(regionSatisfies('eu', 'tenant_operational')).toBe(true);
  });

  it('ANGREP: global provider kan IKKE betjene sluttkundens fritekst', () => {
    expect(regionSatisfies('global', 'customer_freetext')).toBe(false);
    expect(regionSatisfies('global', 'tenant_operational')).toBe(true);
  });

  it('Fireworks erklærer seg global, Mistral EU', () => {
    const fw = createFireworksProvider({ apiKey: 'x' });
    const mi = createMistralProvider({ apiKey: 'x' });
    expect(fw.region).toBe('global');
    expect(mi.region).toBe('eu');
    expect(providerSatisfies(fw, 'customer_freetext')).toBe(false);
    expect(providerSatisfies(mi, 'customer_freetext')).toBe(true);
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
  it('EU-endepunktet godtas', () => {
    expect(() => assertEuEndpoint('https://api.mistral.ai/v1')).not.toThrow();
  });

  it('ANGREP: US-endepunktet avvises', () => {
    expect(() => assertEuEndpoint('https://api.us.mistral.ai/v1')).toThrow(NonEuEndpointError);
  });

  it('søppel-URL avvises', () => {
    expect(() => assertEuEndpoint('ikke-en-url')).toThrow(NonEuEndpointError);
  });

  it('provideren nekter å bli OPPRETTET med feil endepunkt', () => {
    expect(() =>
      createMistralProvider({ apiKey: 'x', baseUrl: 'https://api.us.mistral.ai/v1' }),
    ).toThrow(NonEuEndpointError);
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
