import { describe, expect, it } from 'vitest';
import { nesteTier, oppgraderKnappetekst } from '../src/billing/plans.ts';

describe('oppgraderingspille — TIERS-stigen uten priser', () => {
  it('start og ukjent går til Pro', () => {
    expect(nesteTier(null)?.key).toBe('pro');
    expect(nesteTier('start')?.key).toBe('pro');
    expect(nesteTier('ukjent')?.key).toBe('pro');
    expect(oppgraderKnappetekst(null)).toBe('Oppgrader til Pro');
    expect(oppgraderKnappetekst('start')).toBe('Oppgrader til Pro');
  });

  it('pro går til Enterprise', () => {
    expect(nesteTier('pro')?.key).toBe('enterprise');
    expect(oppgraderKnappetekst('pro')).toBe('Oppgrader til Enterprise');
  });

  it('enterprise har ingen neste — knappen sier bare Enterprise', () => {
    expect(nesteTier('enterprise')).toBeUndefined();
    expect(oppgraderKnappetekst('enterprise')).toBe('Enterprise');
  });

  it('knappetekst inneholder ikke priser', () => {
    for (const key of [null, 'start', 'pro', 'enterprise'] as const) {
      expect(oppgraderKnappetekst(key)).not.toMatch(/\d/);
      expect(oppgraderKnappetekst(key)).not.toMatch(/kr|øre|nok/i);
    }
  });
});
