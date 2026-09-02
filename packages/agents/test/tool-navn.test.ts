import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

const AGENT_FILER = [
  '../src/workshop/agent.ts',
  '../src/drift-innsikt/agent.ts',
  '../src/drift-innsikt/lager-verktoy.ts',
  '../src/kunde-support/agent.ts',
  '../src/ai-diagnose/agent.ts',
];

/** Mistral 400 02.09: function name må være ASCII. */
const TOOL_NOKKEL = /^\s+([A-Za-zÆØÅæøå_][A-Za-zÆØÅæøå0-9_]*)\s*:\s*tool\(/gm;
const MISTRAL = /^[a-zA-Z0-9]+(?:[._-][a-zA-Z0-9]+)*$/;

describe('Alle agent-tools som sendes til Mistral er ASCII', () => {
  it('ingen æ/ø/å eller mellomrom i tool-nøkler', () => {
    const funnet: string[] = [];
    for (const fil of AGENT_FILER) {
      const src = les(fil);
      for (const m of src.matchAll(TOOL_NOKKEL)) {
        funnet.push(`${fil}:${m[1]}`);
        expect(m[1], `${fil} tool «${m[1]}»`).toMatch(MISTRAL);
        expect(m[1], `${fil} tool «${m[1]}»`).not.toMatch(/[æøåÆØÅ ]/);
      }
    }
    expect(funnet.some((n) => n.endsWith(':gaaTil'))).toBe(true);
    expect(funnet.some((n) => n.endsWith(':sokKunder'))).toBe(true);
    expect(funnet.some((n) => n.includes('gåTil'))).toBe(false);
  });
});
