import type { DataClass } from './data-region.ts';
import { regionSatisfies } from './data-region.ts';
import { createMistralProvider } from './mistral.ts';
import { createMockProvider } from './mock.ts';
import type { ModelProvider } from './provider.ts';

/**
 * F14 / Mikael 02.09.2026 — Leverandørvalg.
 * Begge dataklasser (`customer_freetext` og `tenant_operational`) → Mistral EU.
 * `dataClass` beholdes i signaturen fordi kallstedene sender `agent.dataClass`,
 * og EU-vernet i `spawnAgent` nekter begge klasser mot ikke-EU.
 * Uten nøkkel: mock lokalt. I produksjon er manglende nøkkel en feil.
 */
export class MissingEuProviderError extends Error {
  readonly code = 'MISSING_EU_PROVIDER';
  constructor() {
    super(
      'MISTRAL_API_KEY mangler. Alle agenter (Ronny, kunde-support, intern drift) ' +
        'kjører på Mistral EU. Det finnes ingen fallback.',
    );
  }
}

export function resolveModelProvider(
  dataClass: DataClass,
  env: NodeJS.ProcessEnv = process.env,
): ModelProvider {
  // Begge klasser rutes likt. Parameteren er del av det offentlige API-et.
  void dataClass;

  const isProd = env.NODE_ENV === 'production';

  if (!env.MISTRAL_API_KEY) {
    if (isProd) throw new MissingEuProviderError();
    return createMockProvider();
  }
  return createMistralProvider({
    apiKey: env.MISTRAL_API_KEY,
    baseUrl: env.MISTRAL_BASE_URL,
  });
}

/** Sanity-sjekk brukt av runtimen. Eksportert for test. */
export function providerSatisfies(provider: ModelProvider, dataClass: DataClass): boolean {
  return regionSatisfies(provider.region, dataClass);
}
