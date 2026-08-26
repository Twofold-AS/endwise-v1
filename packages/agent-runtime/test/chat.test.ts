import { createGuardrails } from '@endwise/guardrails';
import { createMockProvider, DataRegionViolation, type ModelProvider } from '@endwise/providers';
import { convertToModelMessages, tool, type UIMessage } from 'ai';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { AgentContext, AgentDefinition } from '../src/index.ts';
import { streamAgentChat } from '../src/index.ts';

/**
 * Chat-inngangen.
 * Hva denne fila faktisk beviser
 * At chat-strømmen kommer fra **vår** runtime med **våre** sperrer — ikke fra
 * en gateway som ruter et sted vi ikke bestemmer. Testene kjører uten nøkkel,
 * uten nettverk og uten database, fordi det som testes er grensene våre, ikke
 * modellens humør (samme begrunnelse som `mock.ts`).
 */

const ctx = (overstyr: Partial<AgentContext> = {}): AgentContext =>
  ({
    db: {} as never,
    tenantId: 'tenant-a',
    userId: 'bruker-1',
    role: 'dealer_admin',
    entitlements: ['ai-diagnose'],
    ...overstyr,
  }) as AgentContext;

const agent = (overstyr: Partial<AgentDefinition> = {}): AgentDefinition => ({
  name: 'test-agent',
  instructions: 'Du er en test.',
  role: 'fast',
  dataClass: 'customer_freetext',
  requiredModule: 'ai-diagnose',
  maxSteps: 3,
  tools: () => ({
    tjenester: tool({
      description: 'test',
      inputSchema: z.object({}),
      execute: async () => [{ navn: 'Liten service' }],
    }),
  }),
  ...overstyr,
});

/** Leser hele tekststrømmen ut av resultatet. */
async function lesTekst(result: { textStream: AsyncIterable<string> }): Promise<string> {
  let ut = '';
  for await (const bit of result.textStream) ut += bit;
  return ut;
}

const meldinger = async (tekst: string) =>
  convertToModelMessages([
    { id: 'm1', role: 'user', parts: [{ type: 'text', text: tekst }] },
  ] as UIMessage[]);

describe('streamAgentChat (F6-18)', () => {
  it('strømmer tekst fra vår egen runtime', async () => {
    const result = streamAgentChat({
      agent: agent(),
      context: ctx(),
      provider: createMockProvider({ chunks: ['Bremsene ', 'bør sjekkes.'] }),
      guardrails: createGuardrails(),
      messages: await meldinger('Bremsene er myke'),
    });

    expect(await lesTekst(result)).toBe('Bremsene bør sjekkes.');
  });

  /**
   * Kjernen i hele F14-rutingen. En `customer_freetext`-agent mot en
   * leverandør utenfor EU skal ikke kunne starte — ikke logges, ikke advares
   * om. Dette er testen som gjør at ingen kan «bare midlertidig» rute
   * kundesamtaler til en amerikansk modell.
   */
  it('⛔ nekter customer_freetext mot en leverandør utenfor EU', async () => {
    const globalProvider: ModelProvider = {
      ...createMockProvider(),
      name: 'fake-us',
      region: 'global',
    };

    await expect(async () =>
      streamAgentChat({
        agent: agent({ dataClass: 'customer_freetext' }),
        context: ctx(),
        provider: globalProvider,
        guardrails: createGuardrails(),
        messages: await meldinger('hei'),
      }),
    ).rejects.toBeInstanceOf(DataRegionViolation);
  });

  it('tillater tenant_operational mot en global leverandør', async () => {
    const globalProvider: ModelProvider = {
      ...createMockProvider(),
      name: 'fake-us',
      region: 'global',
    };

    const result = streamAgentChat({
      agent: agent({ dataClass: 'tenant_operational' }),
      context: ctx(),
      provider: globalProvider,
      guardrails: createGuardrails(),
      messages: await meldinger('hei'),
    });
    expect(await lesTekst(result)).toContain('Hei');
  });

  it('⛔ nekter en agent forhandleren ikke har betalt for', async () => {
    await expect(async () =>
      streamAgentChat({
        agent: agent({ requiredModule: 'ai-nettside' }),
        context: ctx({ entitlements: ['ai-diagnose'] }),
        provider: createMockProvider(),
        guardrails: createGuardrails(),
        messages: await meldinger('hei'),
      }),
    ).rejects.toThrow(/ai-nettside/);
  });

  /**
   * L4 må virke I strømmen, ikke bare på ferdig tekst. Her deles nøkkelen over
   * to tokens med vilje — det er nøyaktig tilfellet som slipper gjennom hvis man
   * filtrerer per bit.
   */
  it('⛔ redigerer bort hemmeligheter som kommer delt over flere tokens', async () => {
    const result = streamAgentChat({
      agent: agent(),
      context: ctx(),
      provider: createMockProvider({
        chunks: ['Nøkkelen er sk-abcdefghij', 'klmnopqrstuvwxyz01 — ikke del den.'],
      }),
      guardrails: createGuardrails(),
      messages: await meldinger('hva er nøkkelen'),
    });

    const tekst = await lesTekst(result);
    expect(tekst).not.toContain('sk-abcdefghijklmnopqrstuvwxyz01');
    expect(tekst).toContain('[API-NØKKEL FJERNET]');
  });
});
