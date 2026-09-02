import { createMistral } from '@ai-sdk/mistral';
import type { LanguageModel } from 'ai';
import { catalogFromEnv, type ModelCatalog, type PlanKey, resolveModel } from './model-catalog.ts';
import type { ModelProvider, ModelRequest } from './provider.ts';

/**
 * F14 / Mikael 02.09.2026 — Mistral (EU). Leverandøren for ALLE agenter
 * (Ronny/workshop, kunde-support/widget, intern drift). Function calling
 * via chat completions + våre tools — ikke Mistral Agents API.
 * Base-URL-en er en sikkerhetsgrense, ikke en innstilling.
 * Mistral hoster i EU **som standard** — men de har også et eksplisitt
 * Us-endepunkt, og bruker du det, ligger dataene i usa (deres egen
 * dokumentasjon sier det rett ut). Derfor:
 * vi setter base-URL eksplisitt til EU-endepunktet
 * vi nekter å starte hvis noen har overstyrt den til noe annet
 * En feilstavet miljøvariabel skal ikke kunne flytte norske kunders
 * helseopplysninger over Atlanteren i stillhet.
 */
export const MISTRAL_EU_BASE_URL = 'https://api.mistral.ai/v1';

/** Kjente ikke-EU-endepunkter. Treffer vi ett av disse, stopper vi. */
const NON_EU_HOSTS = ['api.us.mistral.ai'];

export class NonEuEndpointError extends Error {
  readonly code = 'NON_EU_ENDPOINT';
  constructor(url: string) {
    super(
      `Mistral-endepunktet «${url}» er ikke EU. Mistral tilbyr et eksplisitt ` +
        'US-endepunkt — det skal aldri brukes av Endwise. Se docs/personvern/.',
    );
  }
}

export function assertEuEndpoint(baseUrl: string): void {
  let host: string;
  try {
    host = new URL(baseUrl).host;
  } catch {
    throw new NonEuEndpointError(baseUrl);
  }
  if (NON_EU_HOSTS.some((bad) => host === bad || host.endsWith(`.${bad}`))) {
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
    region: 'eu',

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
