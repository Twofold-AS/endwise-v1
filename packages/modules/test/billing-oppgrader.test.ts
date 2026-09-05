import { describe, expect, it } from 'vitest';
import {
  effektivPlanNokkel,
  nesteTier,
  oppgraderKnappetekst,
  visOppgraderCta,
} from '../src/billing/plans.ts';

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

  it('billing-nøkkel vinner over tenants.plan, ukjent billing faller tilbake', () => {
    expect(effektivPlanNokkel(null, 'enterprise')).toBe('enterprise');
    expect(effektivPlanNokkel('pro', 'enterprise')).toBe('pro');
    expect(effektivPlanNokkel('ukjent', 'start')).toBe('start');
    expect(effektivPlanNokkel(null, null)).toBeNull();
    expect(visOppgraderCta('enterprise')).toBe(false);
    expect(visOppgraderCta('pro')).toBe(true);
    expect(visOppgraderCta(null)).toBe(true);
  });
});
