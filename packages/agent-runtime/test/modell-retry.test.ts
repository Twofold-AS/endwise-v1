import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MODELL_MAX_RETRIES } from '../src/modell-retry.ts';

/**
 * AI SDK `streamText` defaulter til maxRetries: 2 (= 3 HTTP-forsøk).
 * På Mistral 429 (kode 1300) brenner det kvoten tre ganger per tool-steg.
 * Vi slår av retry: feil raskt, ikke 3× mot en delt org-grense.
 */
describe('modell-kall retry (LLM10 / 429)', () => {
  it('maxRetries er 0 — ikke SDK-default 2', () => {
    expect(MODELL_MAX_RETRIES).toBe(0);
  });

  it('runAgent og streamAgentChat sender maxRetries til streamText', () => {
    const rot = join(dirname(fileURLToPath(import.meta.url)), '../src');
    const loop = readFileSync(join(rot, 'loop.ts'), 'utf8');
    const chat = readFileSync(join(rot, 'chat.ts'), 'utf8');
    expect(loop).toMatch(/maxRetries:\s*MODELL_MAX_RETRIES/);
    expect(chat).toMatch(/maxRetries:\s*MODELL_MAX_RETRIES/);
  });
});
