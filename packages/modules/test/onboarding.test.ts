import { describe, expect, it } from 'vitest';
import {
  AI_TAK_DEFAULT,
  ONBOARDING_KATEGORIER,
  rensAiTak,
  rensApningstider,
  rensKategorier,
  standardApningstider,
} from '../src/onboarding/index.ts';

describe('F31 / white label F10: onboarding', () => {
  it('standard åpningstider er man–lør åpent, søn stengt', () => {
    const tider = standardApningstider();
    expect(tider).toHaveLength(7);
    expect(tider.find((t) => t.dag === 0)?.stengt).toBe(true);
    expect(tider.find((t) => t.dag === 1)?.fra).toBe('08:00');
    expect(tider.find((t) => t.dag === 6)?.fra).toBe('10:00');
  });

  it('rensere feiler lukket mot ukjent og tomt', () => {
    expect(rensKategorier(['mc', 'ukjent', 'atv'])).toEqual(['mc', 'atv']);
    expect(rensKategorier(null)).toEqual([]);
    expect(ONBOARDING_KATEGORIER).toContain('bat');
    expect(rensAiTak('x')).toBe(AI_TAK_DEFAULT);
    expect(rensAiTak(5)).toBe(20);
    expect(rensAiTak(9000)).toBe(2000);
    expect(rensApningstider([])[0]?.dag).toBeDefined();
  });
});
