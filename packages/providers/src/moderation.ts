import type { ModerationCategory, ModerationResult } from '@endwise/guardrails';
import { assertEuEndpoint, MISTRAL_EU_BASE_URL } from './mistral.ts';

/**
 * F14-05 — Mistral Moderations som motor for scope-gaten.
 *
 * `POST /v1/chat/moderations` med `mistral-moderation-2603`. Ni kategorier;
 * vi bryr oss om **health**, **pii**, **law** og **selfharm**.
 *
 * Ligger i `providers` og ikke i `guardrails`, fordi guardrails ikke skal kjenne
 * HTTP eller leverandører — den tar imot en `Moderator`-funksjon. Bytter vi
 * moderasjonsmotor, er det denne fila som erstattes.
 *
 * ⚠️ Samme EU-assert som chat-modellen. Moderasjonskallet ser NØYAKTIG samme
 * fritekst som vi prøver å beskytte — en scope-gate som lekker er verre enn
 * ingen scope-gate, fordi den gir falsk trygghet.
 */
const MODERATION_MODEL_ENV = 'MISTRAL_MODEL_MODERATION';

export function createMistralModerator(options?: { apiKey?: string; baseUrl?: string }) {
  const apiKey = options?.apiKey ?? process.env.MISTRAL_API_KEY ?? '';
  const baseUrl = options?.baseUrl ?? process.env.MISTRAL_BASE_URL ?? MISTRAL_EU_BASE_URL;
  assertEuEndpoint(baseUrl);

  return async (text: string): Promise<ModerationResult> => {
    const model = process.env[MODERATION_MODEL_ENV];
    if (!apiKey) throw new Error('MISTRAL_API_KEY mangler — scope-gaten kan ikke kjøre');
    if (!model) {
      throw new Error(
        `${MODERATION_MODEL_ENV} mangler. Sett moderasjonsmodellen (f.eks. mistral-moderation-2603).`,
      );
    }

    const response = await fetch(`${baseUrl}/chat/moderations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: [[{ role: 'user', content: text }]],
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral moderations svarte ${response.status}`);
    }

    const body = (await response.json()) as {
      results?: Array<{
        categories?: Record<string, boolean>;
        category_scores?: Record<string, number>;
      }>;
    };

    const first = body.results?.[0];
    return {
      categories: (first?.categories ?? {}) as Partial<Record<ModerationCategory, boolean>>,
      categoryScores: (first?.category_scores ?? {}) as Partial<Record<ModerationCategory, number>>,
    };
  };
}
