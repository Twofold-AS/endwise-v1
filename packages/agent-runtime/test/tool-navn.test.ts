import { createGuardrails } from '@endwise/guardrails';
import { createMockProvider } from '@endwise/providers';
import { tool } from 'ai';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  type AgentContext,
  type AgentDefinition,
  assertAsciiToolNames,
  erMistralToolNavn,
  streamAgentChat,
  UgyldigToolNavnError,
} from '../src/index.ts';

describe('Mistral tool-navn (ASCII)', () => {
  it('godtar gaaTil og sokKunder, avviser gåTil og mellomrom', () => {
    expect(erMistralToolNavn('gaaTil')).toBe(true);
    expect(erMistralToolNavn('sokKunder')).toBe(true);
    expect(erMistralToolNavn('aapneInnboks')).toBe(true);
    expect(erMistralToolNavn('gåTil')).toBe(false);
    expect(erMistralToolNavn('søkKunder')).toBe(false);
    expect(erMistralToolNavn('åpne Innboks')).toBe(false);
  });

  it('assert kaster ærlig norsk feil på æ/ø/å', () => {
    expect(() => assertAsciiToolNames({ gåTil: {} })).toThrow(UgyldigToolNavnError);
    expect(() => assertAsciiToolNames({ gåTil: {} })).toThrow(/gåTil/);
    expect(() => assertAsciiToolNames({ gaaTil: {} })).not.toThrow();
  });
});

const ctx = (): AgentContext =>
  ({
    db: {} as never,
    tenantId: 'tenant-a',
    userId: 'bruker-1',
    role: 'dealer_admin',
    entitlements: [],
  }) as AgentContext;

describe('streamAgentChat nekter ikke-ASCII tool-navn før Mistral', () => {
  it('kaster UgyldigToolNavnError på gåTil — ikke AI_APICallError etter 200', async () => {
    const agent: AgentDefinition = {
      name: 'test-ascii',
      instructions: 'test',
      role: 'fast',
      dataClass: 'tenant_operational',
      requiredModule: null,
      maxSteps: 2,
      tools: () => ({
        gåTil: tool({
          description: 'naviger',
          inputSchema: z.object({}),
          execute: async () => ({ ok: true }),
        }),
      }),
    };

    expect(() =>
      streamAgentChat({
        agent,
        context: ctx(),
        provider: createMockProvider(),
        guardrails: createGuardrails(),
        messages: [] as never,
      }),
    ).toThrow(UgyldigToolNavnError);
  });
});
