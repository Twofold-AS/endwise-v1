import { createMistral } from '@ai-sdk/mistral';
import type { LanguageModel } from 'ai';
import type { DataRegion } from './data-region.ts';
import { catalogFromEnv, type ModelCatalog, type PlanKey, resolveModel } from './model-catalog.ts';
import type { ModelProvider, ModelRequest } from './provider.ts';

/**
 * F14 — Mistral EU-lås.
 * Base-URL-en er en sikkerhetsgrense, ikke en innstilling.
 * `api.mistral.ai` er det globale endepunktet: Mistral lover ikke hvor
 * inferensen kjører. `api.us.mistral.ai` er USA. Eneste lovlige host er
 * `api.eu.mistral.ai` (regional inference i EU/EFTA).
 * Allowlist, ikke denyliste: en vilkårlig `MISTRAL_BASE_URL` skal ikke
 * kunne flytte norske kunders helseopplysninger ut av EU i stillhet.
 * Region utledes fra URL-en, ikke hardkodes.
 * Function calling via chat completions + våre tools — ikke Mistral
 * Agents / Batch / Files API (ikke støttet på regionalt endepunkt).
 */
export const MISTRAL_EU_HOST = 'api.eu.mistral.ai';
export const MISTRAL_EU_BASE_URL = `https://${MISTRAL_EU_HOST}/v1`;

export class NonEuEndpointError extends Error {
  readonly code = 'NON_EU_ENDPOINT';
  constructor(url: string) {
    super(
      `Mistral-endepunktet «${url}» er ikke EU. Kun host ${MISTRAL_EU_HOST} er tillatt. ` +
        'api.mistral.ai (global) og api.us.mistral.ai er sperret. Se docs/personvern/.',
    );
  }
}

export function mistralHostname(baseUrl: string): string {
  try {
    return new URL(baseUrl).hostname.toLowerCase();
  } catch {
    throw new NonEuEndpointError(baseUrl);
  }
}

/** Allowlist: kun `api.eu.mistral.ai`. Alt annet feiler ved oppstart. */
export function assertEuEndpoint(baseUrl: string): void {
  if (mistralHostname(baseUrl) !== MISTRAL_EU_HOST) {
    throw new NonEuEndpointError(baseUrl);
  }
}

/** Region fra URL-ens host-etiketter, ikke en hardkodet konstant. */
export function regionFromMistralUrl(baseUrl: string): DataRegion {
  const labels = mistralHostname(baseUrl).split('.');
  if (labels.includes('eu')) return 'eu';
  throw new NonEuEndpointError(baseUrl);
}

export function createMistralProvider(options?: {
  apiKey?: string;
  baseUrl?: string;
  catalog?: ModelCatalog;
}): ModelProvider {
  const apiKey = options?.apiKey ?? process.env.MISTRAL_API_KEY ?? '';
  const rawBase = options?.baseUrl ?? process.env.MISTRAL_BASE_URL;
  const baseURL = rawBase && rawBase.length > 0 ? rawBase : MISTRAL_EU_BASE_URL;

  // Sjekkes ved opprettelse, ikke ved første kall. En feilkonfigurert prosess
  // skal ikke få lov til å starte og så feile ved første kunde.
  assertEuEndpoint(baseURL);
  const region = regionFromMistralUrl(baseURL);

  const catalog = options?.catalog ?? catalogFromEnv('MISTRAL');
  const mistral = createMistral({ apiKey, baseURL });

  return {
    name: 'mistral',
    region,

    isConfigured() {
      return apiKey.length > 0;
    },

    model(request: ModelRequest): LanguageModel {
      if (!apiKey) {
        throw new Error(
          'MISTRAL_API_KEY mangler. Sett den i .env.local — ingen kodeendring trengs.',
        );
      }
      const modelId = resolveModel(catalog, request.role, {
        plan: request.plan as PlanKey | undefined,
        tenantId: request.tenantId,
      });
      return mistral(modelId);
    },
  };
}
