import { createMistral } from '@ai-sdk/mistral';
import type { LanguageModel } from 'ai';
import type { DataRegion } from './data-region.ts';
import { catalogFromEnv, type ModelCatalog, type PlanKey, resolveModel } from './model-catalog.ts';
import type { ModelProvider, ModelRequest } from './provider.ts';

/**
 * F14 / Mikael 23.10.2026 — Mistral (dedikert EU-endepunkt).
 * Leverandøren for ALLE agenter (Ronny/workshop, kunde-support/widget,
 * intern drift). Function calling via chat completions + våre tools —
 * ikke Mistral Agents API (EU-endepunktet støtter uansett ikke Agents,
 * Batch eller Files).
 * `api.mistral.ai` er globalt og lover ikke inferens-sted. Kun
 * `api.eu.mistral.ai` er allowlistet. En `MISTRAL_BASE_URL`-override
 * til noe annet skal ikke kunne flytte norske kunders helseopplysninger
 * ut av EU i stillhet.
 */
export const MISTRAL_EU_HOST = 'api.eu.mistral.ai';
export const MISTRAL_EU_BASE_URL = 'https://api.eu.mistral.ai/v1';

export class NonEuEndpointError extends Error {
  readonly code = 'NON_EU_ENDPOINT';
  constructor(url: string) {
    super(
      `Mistral-endepunktet «${url}» er ikke det dedikerte EU-endepunktet. ` +
        'Kun api.eu.mistral.ai er tillatt. api.mistral.ai (global) og ' +
        'api.us.mistral.ai skal aldri brukes av Endwise. Se docs/personvern/.',
    );
  }
}

function endpointHost(baseUrl: string): string {
  return new URL(baseUrl).hostname.toLowerCase();
}

/** Region utledet fra URL. Bare host `api.eu.mistral.ai` er `eu`. */
export function regionFromEndpoint(baseUrl: string): DataRegion {
  let host: string;
  try {
    host = endpointHost(baseUrl);
  } catch {
    return 'global';
  }
  return host === MISTRAL_EU_HOST ? 'eu' : 'global';
}

/** Allowlist: kun host `api.eu.mistral.ai`. Alt annet kaster ved oppstart. */
export function assertEuEndpoint(baseUrl: string): void {
  let host: string;
  try {
    host = endpointHost(baseUrl);
  } catch {
    throw new NonEuEndpointError(baseUrl);
  }
  if (host !== MISTRAL_EU_HOST) {
    throw new NonEuEndpointError(baseUrl);
  }
}

export function createMistralProvider(options?: {
  apiKey?: string;
  baseUrl?: string;
  catalog?: ModelCatalog;
}): ModelProvider {
  const apiKey = options?.apiKey ?? process.env.MISTRAL_API_KEY ?? '';
  const baseURL = options?.baseUrl ?? process.env.MISTRAL_BASE_URL ?? MISTRAL_EU_BASE_URL;

  // Sjekkes ved opprettelse, ikke ved første kall. En feilkonfigurert prosess
  // skal ikke få lov til å starte og så feile ved første kunde.
  assertEuEndpoint(baseURL);

  const catalog = options?.catalog ?? catalogFromEnv('MISTRAL');
  const mistral = createMistral({ apiKey, baseURL });

  return {
    name: 'mistral',
    region: regionFromEndpoint(baseURL),

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
