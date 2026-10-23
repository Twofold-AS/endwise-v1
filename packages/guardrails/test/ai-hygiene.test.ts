import { describe, expect, it, vi } from 'vitest';
import { prepareModelMessages } from '../src/ai-hygiene.ts';
import { ScopeGateViolation } from '../src/scope-gate.ts';

const ctx = { tenantId: 't-a', userId: 'u-1', role: 'customer' };

describe('AI-hygiene: masker før moderasjon', () => {
  it('sender maskert tekst til moderator, ikke fødselsnummer', async () => {
    const seen: string[] = [];
    const prepared = await prepareModelMessages({
      messages: [{ role: 'user', content: 'Fnr 01019012345 og ola@example.no' }],
      context: ctx,
      moderate: async (text) => {
        seen.push(text);
        return { categories: {} };
      },
    });

    expect(seen).toHaveLength(1);
    expect(seen[0]).not.toContain('01019012345');
    expect(seen[0]).not.toContain('ola@example.no');
    expect(seen[0]).toContain('[FNR_1]');
    expect(seen[0]).toContain('[EPOST_1]');
    expect(prepared.messages[0]?.content).toContain('[FNR_1]');
  });

  it('blokkerer ved sensitive kategorier (fail-closed)', async () => {
    await expect(
      prepareModelMessages({
        messages: [{ role: 'user', content: 'Jeg har prolaps' }],
        context: ctx,
        moderate: async () => ({ categories: { health: true } }),
      }),
    ).rejects.toBeInstanceOf(ScopeGateViolation);
  });

  it('moderator-feil svelges ikke til allowed', async () => {
    await expect(
      prepareModelMessages({
        messages: [{ role: 'user', content: 'hei' }],
        context: ctx,
        moderate: async () => {
          throw new Error('Mistral moderations svarte 503');
        },
      }),
    ).rejects.toThrow(/503/);
  });

  it('kaller onTrigger ved treff', async () => {
    const onTrigger = vi.fn();
    await expect(
      prepareModelMessages({
        messages: [{ role: 'user', content: 'helse' }],
        context: ctx,
        moderate: async () => ({ categories: { health: true } }),
        onTrigger,
      }),
    ).rejects.toBeInstanceOf(ScopeGateViolation);
    expect(onTrigger).toHaveBeenCalled();
  });
});
