import { describe, expect, it } from 'vitest';
import { SUBPROCESSORS, subprocessorVendors } from '../src/compliance/subprocessors.ts';

describe('underdatabehandlere (F14-15)', () => {
  it('Fireworks er fjernet — agent-runtime ruter ikke dit', () => {
    expect(subprocessorVendors().join(' ')).not.toMatch(/fireworks/i);
  });

  it('Mistral er merket med regionalt EU-endepunkt', () => {
    const mistral = SUBPROCESSORS.find((s) => s.vendor === 'Mistral');
    expect(mistral?.location).toMatch(/api\.eu\.mistral\.ai/);
    expect(mistral?.location).toMatch(/EU/);
  });
});
