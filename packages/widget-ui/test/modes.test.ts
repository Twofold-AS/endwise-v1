import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isWidgetMode, WIDGET_MODES } from '../src/modes.ts';

const root = dirname(fileURLToPath(import.meta.url));

describe('widget-modi (F4-09)', () => {
  it('har Booking, AI, Tracking og Webshop', () => {
    expect(WIDGET_MODES).toEqual(['booking', 'ai', 'tracking', 'webshop']);
    expect(isWidgetMode('booking')).toBe(true);
    expect(isWidgetMode('tenant-a')).toBe(false);
  });

  it('EndwiseWidget konfigurerer modus og kaller ikke tenantId', () => {
    const src = readFileSync(join(root, '../src/EndwiseWidget.tsx'), 'utf8');
    expect(src).toMatch(/mode\?: WidgetMode/);
    expect(src).toMatch(/mode === 'webshop'/);
    expect(src).toMatch(/mode === 'booking'/);
    expect(src).toMatch(/mode === 'ai'/);
    expect(src).toMatch(/track\('widget\.viewed'/);
    expect(src).toMatch(/Nettbutikk er ikke aktiv/);
    expect(src).not.toMatch(/tenantId\s*[:=]/);
    expect(src).not.toMatch(/sk_live_|sk_test_/);
  });

  it('klienten veksler pk_ via /widget/init og tracker uten hemmeligheter', () => {
    const src = readFileSync(join(root, '../src/client.ts'), 'utf8');
    expect(src).toMatch(/publishableKey: opts\.publishableKey/);
    expect(src).toMatch(/\/widget\/events/);
    expect(src).toMatch(/\/widget\/shop\/catalog/);
    expect(src).toMatch(/capabilities/);
    expect(src).not.toMatch(/JSON\.stringify\([^)]*tenantId/);
    expect(src).not.toMatch(/sk_live_|sk_test_/);
  });
});
