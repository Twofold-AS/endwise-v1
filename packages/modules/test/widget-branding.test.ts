import { describe, expect, it } from 'vitest';
import { FORBUDT_CTA } from '../src/branding/index.ts';
import { TOM_WIDGET_BRANDING, widgetBrandingFraRad } from '../src/widget/branding.ts';

describe('F37 / white label F14: widget-branding', () => {
  it('skjuler utkast og upublisert merke', () => {
    expect(
      widgetBrandingFraRad({
        visningsnavn: 'Hemmelig',
        aksentfarge: '#141414',
        publisertAt: null,
      }),
    ).toEqual(TOM_WIDGET_BRANDING);
    expect(widgetBrandingFraRad(null)).toEqual(TOM_WIDGET_BRANDING);
  });

  it('slipper gjennom publisert merke uten tenant-id', () => {
    const b = widgetBrandingFraRad({
      visningsnavn: 'Nordvik MC',
      logoUrl: 'https://blob.example/logo.png',
      aksentfarge: '#141414',
      visLevertAv: true,
      publisertAt: new Date('2026-11-03T12:00:00Z'),
    });
    expect(b.visningsnavn).toBe('Nordvik MC');
    expect(b.logoUrl).toBe('https://blob.example/logo.png');
    expect(b.aksentfarge).toBe('#141414');
    expect(b.aksentTekstfarge).toBe('#ffffff');
    expect(JSON.stringify(b)).not.toMatch(/tenant/i);
  });

  it(`avviser ${'FORBUDT_CTA'} og SVG-logo`, () => {
    const b = widgetBrandingFraRad({
      visningsnavn: 'Blå',
      logoUrl: 'https://blob.example/logo.svg',
      aksentfarge: FORBUDT_CTA,
      publisertAt: new Date('2026-11-03T12:00:00Z'),
    });
    expect(b.aksentfarge).toBeNull();
    expect(b.logoUrl).toBeNull();
    expect(b.visningsnavn).toBe('Blå');
  });
});
