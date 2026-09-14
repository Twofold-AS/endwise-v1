import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('F4 Framer-flate — widget-ruter', () => {
  const ruta = les('../src/routes/widget/index.ts');

  it('init returnerer shop-capability uten tenantId til klienten', () => {
    expect(ruta).toMatch(/capabilities:\s*\{\s*shop\s*\}/);
    expect(ruta).toMatch(/resolveShopFlag/);
    expect(ruta).not.toMatch(/return c\.json\(\{[^}]*tenantId/);
  });

  it('tar imot funnel-events til eksisterende stream, ikke egen analytics', () => {
    expect(ruta).toMatch(/sanitizeWidgetFunnelEvent/);
    expect(ruta).toMatch(/publishEvent/);
    expect(ruta).toMatch(/WIDGET_FUNNEL_AUDIENCE/);
    expect(ruta).toMatch(/app\.post\('\/events'/);
  });

  it('webshop-katalog feiler lukket uten shop-flagg', () => {
    expect(ruta).toMatch(/app\.get\('\/shop\/catalog'/);
    expect(ruta).toMatch(/Butikk er ikke aktiv for denne forhandleren/);
    expect(ruta).toMatch(/403/);
    expect(ruta).toMatch(/lesShopKatalog/);
  });
});
