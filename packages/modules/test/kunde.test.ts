import { describe, expect, it } from 'vitest';
import { JOBB_FASER, jobbFase, rensKundeMelding } from '../src/kunde/index.ts';

describe('F33 / white label F11b: kunde handling', () => {
  it('jobbfase er Mottatt · Under arbeid · Klar', () => {
    expect(JOBB_FASER).toEqual(['Mottatt', 'Under arbeid', 'Klar']);
    expect(jobbFase('draft')).toEqual({ merkelapp: 'Mottatt', steg: 0 });
    expect(jobbFase('confirmed')).toEqual({ merkelapp: 'Mottatt', steg: 0 });
    expect(jobbFase('in_progress')).toEqual({ merkelapp: 'Under arbeid', steg: 1 });
    expect(jobbFase('completed')).toEqual({ merkelapp: 'Klar', steg: 2 });
    expect(jobbFase('cancelled').steg).toBe(-1);
  });

  it('rensKundeMelding feiler lukket mot tomt og for langt', () => {
    expect(rensKundeMelding('  hei  ')).toBe('hei');
    expect(() => rensKundeMelding('   ')).toThrow(/Skriv en melding/);
    expect(() => rensKundeMelding('x'.repeat(2001))).toThrow(/maks 2000/);
  });
});
