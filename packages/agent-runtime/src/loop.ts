import type { GuardrailPipeline } from '@endwise/guardrails';
import { DataRegionViolation, type ModelProvider, providerSatisfies } from '@endwise/providers';
import { isStepCount, type ModelMessage, streamText } from 'ai';
import { type AgentDefinition, assertEntitled } from './agent.ts';
import { type AgentContext, sealContext } from './context.ts';

export type AgentEvent =
  | { type: 'agent.start'; agent: string }
  | { type: 'agent.token'; text: string }
  | { type: 'agent.tool_call'; tool: string }
  | { type: 'agent.tool_result'; tool: string }
  | { type: 'agent.done'; text: string }
  | { type: 'agent.error'; message: string };

export interface RunOptions {
  agent: AgentDefinition;
  context: AgentContext;
  provider: ModelProvider;
  guardrails: GuardrailPipeline;
  messages: ModelMessage[];
  /** Hver hendelse pushes hit — normalt rett videre til SSE (F6-02). */
  onEvent: (event: AgentEvent) => void | Promise<void>;
}

interface RunWithToolsOptions extends RunOptions {
  /** Verktøy bygget ved spawn, med frosset kontekst. Løkka bygger dem aldri selv. */
  tools: Record<string, import('ai').Tool>;
}

/**
 * Den tynne master-løkka. **lukket for endring** (techstack §2).
 * Den gjør nøyaktig fire ting:
 * 1. sjekk entitlement
 * 2. bygg verktøy med konteksten (som er forseglet)
 * 3. kjør modellen med tool-loop (AI SDK `stopWhen: isStepCount`)
 * 4. send hendelser videre
 * Alt annet — hvilke verktøy, hvilke regler, hvilken oppførsel — ligger i
 * Tools og guardrails, ikke her. Grunnen er enkel: en løkke som vokser med
 * spesialtilfeller blir til slutt et sted der sikkerhetsregler kan gå tapt i
 * en if-setning. Derfor er den liten nok til å leses i sin helhet.
 * Circuit breaker: `agent.maxSteps`. En modell som kaller verktøy i evig løkke
 * er ikke et teoretisk problem — det er en regning.
 */
export async function runAgent(options: RunOptions): Promise<string> {
  const context = sealContext(options.context);
  assertEntitled(options.agent, context);

  // Samme regionsjekk som i spawnAgent. Den finnes to steder fordi det finnes
  // to innganger — og en sikkerhetsregel som bare gjelder den ene inngangen, er
  // ingen sikkerhetsregel.
  if (!providerSatisfies(options.provider, options.agent.dataClass)) {
    throw new DataRegionViolation(
      options.agent.name,
      options.agent.dataClass,
      options.provider.name,
      options.provider.region,
    );
  }

  return runAgentWithTools({
    ...options,
    context,
    tools: options.guardrails.wrapTools(options.agent.tools(context), context),
  });
}

/**
 * Selve løkka. Tar verktøyene ferdig bygget — den kan ikke lage nye, og har
 * derfor ingen mulighet til å bygge et verktøy med en annen tenant enn den
 * agenten ble spawnet for. Se `spawn.ts`.
 */
export async function runAgentWithTools(options: RunWithToolsOptions): Promise<string> {
  const { agent, provider, guardrails, onEvent, tools } = options;
  const context = options.context;

  // L1 — inngangsfilter. Brukerinput er ikke instruksjoner.
  const messages = await guardrails.filterInput(options.messages, context);

  await onEvent({ type: 'agent.start', agent: agent.name });

  const result = streamText({
    model: provider.model({ role: agent.role, tenantId: context.tenantId }),
    system: agent.instructions,
    messages,
    tools,
    stopWhen: isStepCount(agent.maxSteps),
  });

  let text = '';

  try {
    for await (const part of result.stream) {
      switch (part.type) {
        case 'text-delta': {
          text += part.text;
          await onEvent({ type: 'agent.token', text: part.text });
          break;
        }
        case 'tool-call': {
          await onEvent({ type: 'agent.tool_call', tool: part.toolName });
          break;
        }
        case 'tool-result': {
          await onEvent({ type: 'agent.tool_result', tool: part.toolName });
          break;
        }
        case 'error': {
          await onEvent({ type: 'agent.error', message: String(part.error) });
          break;
        }
        default:
          break;
      }
    }
  } catch (error) {
    await onEvent({ type: 'agent.error', message: (error as Error).message });
    throw error;
  }

  // L4 — utgangsfilter. Det agenten sier, går gjennom en sil før mennesket ser det.
  const safe = await guardrails.filterOutput(text, context);
  await onEvent({ type: 'agent.done', text: safe });
  return safe;
}
