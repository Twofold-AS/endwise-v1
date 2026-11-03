import { describe, expect, it } from 'vitest';
import {
  erForbudtCtaFarge,
  FORBUDT_CTA,
  sjekkLogoBytes,
  stripPngMetadata,
  utkastFraUkjent,
  vurderAksent,
} from '../src/branding/index.ts';

function pngMedTekst(): Uint8Array {
  const sign = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const ihdr = [
    0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 0, 0, 0, 0,
  ];
  const text = [0, 0, 0, 4, 0x74, 0x45, 0x58, 0x74, 65, 66, 67, 68, 0, 0, 0, 0];
  const iend = [0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82];
  return new Uint8Array([...sign, ...ihdr, ...text, ...iend]);
}

describe('F19 / white label F3: branding', () => {
  it('avviser #0066ff og naboer', () => {
    expect(erForbudtCtaFarge(FORBUDT_CTA)).toBe(true);
    expect(erForbudtCtaFarge('#0066FE')).toBe(true);
    expect(erForbudtCtaFarge('#141414')).toBe(false);
  });

  it('krever WCAG AA og velger tekstfarge', () => {
    const mork = vurderAksent('#141414');
    expect(mork.ok).toBe(true);
    if (mork.ok) {
      expect(mork.tekst).toBe('#ffffff');
      expect(mork.kontrast).toBeGreaterThanOrEqual(4.5);
    }
    const darlig = vurderAksent('#777777');
    expect(darlig.ok).toBe(false);
    expect(vurderAksent('blå').ok).toBe(false);
  });

  it('avviser SVG og godtar PNG med strippet metadata', () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    expect(sjekkLogoBytes(svg).ok).toBe(false);
    const png = pngMedTekst();
    const ok = sjekkLogoBytes(png);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.mime).toBe('image/png');
      expect(ok.bytes).not.toEqual(png);
      expect(Buffer.from(ok.bytes).includes(Buffer.from('tEXt'))).toBe(false);
    }
    expect(stripPngMetadata(png).byteLength).toBeLessThan(png.byteLength);
  });

  it('utkast leser bare kjente felt', () => {
    const u = utkastFraUkjent(
      { visningsnavn: 'Nordvik', logoUrl: 'https://blob.example/a.png', hemmelig: 'nei' },
      'Fallback',
    );
    expect(u.visningsnavn).toBe('Nordvik');
    expect(u.logoUrl).toBe('https://blob.example/a.png');
    expect(JSON.stringify(u)).not.toMatch(/hemmelig/);
  });
});
