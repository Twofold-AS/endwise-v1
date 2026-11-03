import { describe, expect, it } from 'vitest';
import { byggEpostHtml, meldingsboks } from '../src/senders/epost-mal.ts';
import {
  avsenderAdresseErKanonisk,
  formaterAvsenderFrom,
  harLinjeskift,
  validerVisningsnavn,
} from '../src/senders/merke.ts';

describe('F20 / white label F4: merke og avsender', () => {
  it('avviser linjeskift og anførsel i navn', () => {
    expect(harLinjeskift('Nordvik\nMC')).toBe(true);
    expect(() => validerVisningsnavn('Nordvik\nMC')).toThrow(/linjeskift/);
    expect(() => validerVisningsnavn('Vipps')).toThrow(/godkjennes/);
    expect(validerVisningsnavn('Nordvik "MC"')).toBe('Nordvik MC');
  });

  it('From bruker forhandlernavn og kanonisk adresse', () => {
    expect(formaterAvsenderFrom('Nordvik MC')).toBe('Nordvik MC <noreply@endwise.no>');
    expect(avsenderAdresseErKanonisk('Nordvik MC <noreply@endwise.no>')).toBe(true);
    expect(avsenderAdresseErKanonisk('Nordvik MC <ondt@example.com>')).toBe(false);
  });

  it('kunde-e-post nevner Endwise bare i fot', () => {
    const html = byggEpostHtml({
      tittel: 'EU-kontroll',
      ingress: 'Kari hos Nordvik har sendt deg en melding.',
      innhold: meldingsboks('Bilen er klar.'),
      fotnote: 'Svarer du, går svaret til Kari.',
      merke: { navn: 'Nordvik', levertAv: true },
    });
    expect(html).toContain('Nordvik');
    expect(html).toContain('Levert av Endwise');
    expect(html).not.toMatch(/alt="Endwise"/);
    expect(html).not.toContain('Sendt via Endwise');
    expect(html).not.toContain('cid:');
    const fotMerkelapp = 'Levert av Endwise';
    const fot = html.lastIndexOf(fotMerkelapp);
    expect(fot).toBeGreaterThan(-1);
    expect(html.slice(0, fot)).not.toMatch(/Endwise/);
    expect(html.slice(fot + fotMerkelapp.length)).not.toMatch(/Endwise/);
  });

  it('ansatt-e-post forblir Endwise-merket', () => {
    const html = byggEpostHtml({
      tittel: 'Engangskode',
      ingress: 'Koden din',
      innhold: 'x',
      fotnote: 'Si fra.',
    });
    expect(html).toMatch(/alt="Endwise"/);
    expect(html).toContain('>Endwise</p>');
  });
});
