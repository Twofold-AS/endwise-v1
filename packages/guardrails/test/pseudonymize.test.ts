import { describe, expect, it } from 'vitest';
import { createPseudonymizer, maskMessages } from '../src/pseudonymize.ts';

/** F14-01 — Dataminimering (art. 5(1)(c)). Ikke anonymisering. */
describe('pseudonymisering (F14-01)', () => {
  it('maskerer e-post, telefon og regnr', () => {
    const p = createPseudonymizer();
    const masked = p.mask('Hei, ola@example.no her, tlf 99887766, MC-en er AB12345');

    expect(masked).not.toContain('ola@example.no');
    expect(masked).not.toContain('99887766');
    expect(masked).not.toContain('AB12345');
    expect(masked).toContain('[EPOST_1]');
    expect(masked).toContain('[TLF_1]');
    expect(masked).toContain('[REGNR_1]');
  });

  it('samme verdi gir samme plassholder — modellen skal kunne resonnere om «samme kunde»', () => {
    const p = createPseudonymizer();
    const masked = p.mask('ola@example.no og ola@example.no er samme person');
    expect(masked.match(/\[EPOST_1\]/g)).toHaveLength(2);
    expect(p.size).toBe(1);
  });

  it('unmask setter de ekte verdiene tilbake før mennesket ser svaret', () => {
    const p = createPseudonymizer();
    p.mask('Kontakt meg på ola@example.no');
    const svar = p.unmask('Jeg sender bekreftelse til [EPOST_1].');
    expect(svar).toBe('Jeg sender bekreftelse til ola@example.no.');
  });

  it('vanlig tekst røres ikke', () => {
    const p = createPseudonymizer();
    const text = 'Når kan dere ta EU-kontroll på MC?';
    expect(p.mask(text)).toBe(text);
  });

  it('maskerer brukermeldinger, ikke systemmeldinger', () => {
    const p = createPseudonymizer();
    const masked = maskMessages(
      [
        { role: 'system', content: 'Du er en assistent. Kontakt: drift@endwise.no' },
        { role: 'user', content: 'Jeg er ola@example.no' },
      ],
      p,
    );

    // Systeminstruksjonen er VÅR — den skal ikke maskeres.
    expect(masked[0]?.content).toContain('drift@endwise.no');
    expect(masked[1]?.content).not.toContain('ola@example.no');
  });
});
