import { describe, expect, it } from 'vitest';
import { createPseudonymizer, maskMessages } from '../src/pseudonymize.ts';

/** Dataminimering (art. 5(1)(c)). Ikke anonymisering. */
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

  it('maskerer fødselsnummer', () => {
    const p = createPseudonymizer();
    const masked = p.mask('Fnr 01019012345 må ikke til modellen');
    expect(masked).not.toContain('01019012345');
    expect(masked).toContain('[FNR_1]');
  });

  it('maskerer fødselsnummer med mellomrom', () => {
    const p = createPseudonymizer();
    const masked = p.mask('Fnr 010190 12345 og 01 01 90 12345 er samme');
    expect(masked).not.toMatch(/010190\s*12345/);
    expect(masked).not.toMatch(/01\s*01\s*90\s*12345/);
    expect(masked).toContain('[FNR_1]');
    expect(p.size).toBe(1);
  });

  it('maskerer regnr med små bokstaver', () => {
    const p = createPseudonymizer();
    const masked = p.mask('MC-en er ab12345 og AB12345 er samme');
    expect(masked).not.toMatch(/ab12345/i);
    expect(masked).toContain('[REGNR_1]');
    expect(p.size).toBe(1);
  });

  it('maskerer kjente kundenavn fra kontekst', () => {
    const p = createPseudonymizer({ knownNames: ['Ola Nordmann', 'Kari'] });
    const masked = p.mask('Ola Nordmann ringer, og kari også');
    expect(masked).not.toContain('Ola Nordmann');
    expect(masked).not.toContain('kari');
    expect(masked).toContain('[NAVN_1]');
    expect(masked).toContain('[NAVN_2]');
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

    // Systeminstruksjonen er vår — den skal ikke maskeres.
    expect(masked[0]?.content).toContain('drift@endwise.no');
    expect(masked[1]?.content).not.toContain('ola@example.no');
  });

  it('beholder ikke-tekstdeler når brukermeldingen har parts', () => {
    const p = createPseudonymizer();
    const masked = maskMessages(
      [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Jeg er ola@example.no' },
            { type: 'file', mediaType: 'image/png', url: 'https://eksempel.no/x.png' },
          ],
        },
      ],
      p,
    );
    const content = masked[0]?.content;
    expect(Array.isArray(content)).toBe(true);
    if (!Array.isArray(content)) return;
    expect(content).toHaveLength(2);
    expect(JSON.stringify(content[0])).toContain('[EPOST_1]');
    expect(JSON.stringify(content[1])).toContain('https://eksempel.no/x.png');
  });
});
