import type { DataClass } from './data-region.ts';
import { regionSatisfies } from './data-region.ts';
import { createFireworksProvider } from './fireworks.ts';
import { createMistralProvider } from './mistral.ts';
import { createMockProvider } from './mock.ts';
import type { ModelProvider } from './provider.ts';

/**
 * F14 — Leverandørvalg etter dataklasse, ikke etter smak.
 * customer_freetext → Mistral (EU). Ingen andre alternativer.
 * tenant_operational → Fireworks (global) — eller Mistral hvis vi vil.
 * Uten nøkkel: mock, slik at alt kjører lokalt. I produksjon er manglende nøkkel
 * en feil, ikke en bekvemmelighet — da skal det smelle, ikke stille bli en
 * fake-agent.
 */
export class MissingEuProviderError extends Error {
  readonly code = 'MISSING_EU_PROVIDER';
  constructor() {
    super(
      'MISTRAL_API_KEY mangler. Agenter som behandler sluttkundens fritekst ' +
        'MÅ kjøre på EU-provider — det finnes ingen fallback til Fireworks her.',
    );
  }
}

export function resolveModelProvider(
  dataClass: DataClass,
  env: NodeJS.ProcessEnv = process.env,
): ModelProvider {
  const isProd = env.NODE_ENV === 'production';

  if (dataClass === 'customer_freetext') {
    if (!env.MISTRAL_API_KEY) {
      // Ingen fallback. Å falle tilbake til Fireworks her ville vært å løse et
      // konfigurasjonsproblem med et personvernbrudd.
      if (isProd) throw new MissingEuProviderError();
      return createMockProvider();
    }
    return createMistralProvider({ apiKey: env.MISTRAL_API_KEY });
  }

  if (!env.FIREWORKS_API_KEY) {
    if (isProd) throw new Error('FIREWORKS_API_KEY mangler i produksjon');
    return createMockProvider();
  }
  return createFireworksProvider({ apiKey: env.FIREWORKS_API_KEY });
}

/** Sanity-sjekk brukt av runtimen. Eksportert for test. */
export function providerSatisfies(provider: ModelProvider, dataClass: DataClass): boolean {
  return regionSatisfies(provider.region, dataClass);
}
