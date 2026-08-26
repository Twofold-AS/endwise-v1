import type { LanguageModelV3StreamPart } from '@ai-sdk/provider';
import type { LanguageModel } from 'ai';
import { MockLanguageModelV3, simulateReadableStream } from 'ai/test';
import type { ModelProvider, ModelRequest } from './provider.ts';

export interface MockScript {
  /** Tekstbiter modellen «skriver». */
  chunks?: string[];
  /** Verktøykall modellen ber om. */
  toolCalls?: Array<{ toolName: string; input: unknown }>;
}

/**
 * Fake-leverandøren.
 * Dette er ikke en snarvei. Den finnes fordi:
 * 1. Agent-runtimen skal kunne testes deterministisk. En ekte modell svarer
 * ulikt hver gang, og en test som avhenger av modellens humør er ikke en test.
 * 2. Sikkerhetstestene («kan agenten lese en annen tenants data?») handler om
 * Våre grenser, ikke om modellens oppførsel. De skal kjøre i CI — uten
 * nøkkel, uten nettverk, uten regning.
 * Samme grensesnitt som Fireworks. Legger du inn `FIREWORKS_API_KEY`, kjører
 * nøyaktig samme kode mot ekte modell — ingen kodeendring.
 */
export function createMockProvider(script: MockScript = {}): ModelProvider {
  // Verktøykallene skjer kun i første steg. Uten dette ville modellen kalt samme
  // verktøy igjen etter at resultatet kom tilbake — en evig løkke, som er nøyaktig
  // det L5-grensen finnes for, men som gjør testene ubrukelige.
  let step = 0;

  return {
    name: 'mock',
    // Mocken går ingen steder. Den er trygg for alt.
    region: 'eu',
    isConfigured: () => true,

    model(_request: ModelRequest): LanguageModel {
      const chunks = script.chunks ?? ['Hei! ', 'Jeg kan hjelpe deg.'];
      const toolCalls = step === 0 ? (script.toolCalls ?? []) : [];
      step += 1;

      const parts: LanguageModelV3StreamPart[] = [
        { type: 'stream-start', warnings: [] },
        { type: 'text-start', id: '0' },
        ...chunks.map((text) => ({ type: 'text-delta' as const, id: '0', delta: text })),
        { type: 'text-end', id: '0' },
        ...toolCalls.map((call, i) => ({
          type: 'tool-call' as const,
          toolCallId: `call-${i}`,
          toolName: call.toolName,
          input: JSON.stringify(call.input),
        })),
        {
          type: 'finish',
          finishReason: { unified: toolCalls.length > 0 ? 'tool-calls' : 'stop', raw: undefined },
          usage: {
            inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
            outputTokens: { total: 20, text: 20, reasoning: undefined },
          },
        },
      ];

      return new MockLanguageModelV3({
        doStream: async () => ({ stream: simulateReadableStream({ chunks: parts }) }),
      });
    },
  };
}
