import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FORBUDT_CTA, widgetCtaFarger } from '../src/widget-cta.ts';
import { WIDGET_FALLBACK } from '../src/widget-fallbacks.ts';

const root = dirname(fileURLToPath(import.meta.url));

describe('F37 / white label F14: widget forhandlerbranding', () => {
  it('CTA faller tilbake når fargen er forbudt', () => {
    expect(widgetCtaFarger(FORBUDT_CTA, '#ffffff')).toEqual({
      fill: WIDGET_FALLBACK.accent,
      fg: WIDGET_FALLBACK.accentFg,
    });
    expect(widgetCtaFarger('#141414', '#ffffff')).toEqual({
      fill: '#141414',
      fg: '#ffffff',
    });
    expect(WIDGET_FALLBACK.accent).not.toBe(FORBUDT_CTA);
  });

  it('widgeten henter merke fra init og bruker egen CTA-variabel', () => {
    const widget = readFileSync(join(root, '../src/EndwiseWidget.tsx'), 'utf8');
    const client = readFileSync(join(root, '../src/client.ts'), 'utf8');
    expect(client).toMatch(/branding/);
    expect(widget).toMatch(/visningsnavn/);
    expect(widget).toMatch(/Levert av Endwise/);
    expect(widget).toMatch(/--ew-widget-cta/);
    expect(widget).toMatch(/widgetCtaFarger/);
    expect(widget).not.toMatch(/var\(--ew-accent,/);
  });
});
