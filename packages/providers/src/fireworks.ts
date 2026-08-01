import { createFireworks } from '@ai-sdk/fireworks';
import type { LanguageModel } from 'ai';
import { catalogFromEnv, type ModelCatalog, type PlanKey, resolveModel } from './model-catalog.ts';
import type { ModelProvider, ModelRequest } from './provider.ts';

/**
 * F6-13 — Fireworks (techstack: LLM-leverandør, brukergodkjent 14.07.2026).
 *
 * Merk hvor tynt dette laget er. Det er meningen: hele agent-runtimen snakker
 * med `ModelProvider`, ikke med Fireworks. Skulle leverandøren byttes igjen,
 * er det denne fila som erstattes — ingenting annet.
 */
export function createFireworksProvider(options?: {
  apiKey?: string;
  catalog?: ModelCatalog;
}): ModelProvider {
  const apiKey = options?.apiKey ?? process.env.FIREWORKS_API_KEY ?? '';
  const catalog = options?.catalog ?? catalogFromEnv('FIREWORKS');

  // `createFireworks` kaster ikke på tom nøkkel — feilen kommer først ved kall.
  // Vi vil ha den tidligere enn det, med en setning som sier hva som mangler.
  const fireworks = createFireworks({ apiKey });

  return {
    name: 'fireworks',
    // ⚠️ Fireworks serverless kan ikke region-pinnes — inferensen kan kjøre i USA.
    // Derfor kan denne leverandøren ALDRI betjene en agent som ser sluttkundens
    // fritekst (se data-region.ts).
    region: 'global',

    isConfigured() {
      return apiKey.length > 0;
    },

    model(request: ModelRequest): LanguageModel {
      if (!apiKey) {
        throw new Error(
          'FIREWORKS_API_KEY mangler. Sett den i .env.local — ingen kodeendring trengs.',
        );
      }
      const modelId = resolveModel(catalog, request.role, {
        plan: request.plan as PlanKey | undefined,
        tenantId: request.tenantId,
      });
      return fireworks(modelId);
    },
  };
}
