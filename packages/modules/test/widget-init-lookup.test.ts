import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { originAllowed } from '../src/widget/origin.ts';
import { BUTIKK_TEST_WIDGET_LABEL, ENDWISE_APP_ORIGIN } from '../src/widget/service.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

/**
 * /widget/init 401: nøkkeloppslaget må gå via SECURITY DEFINER, samme
 * klasse som lookup_open_invitation. Unscopet select mot widget_keys
 * gir 0 rader under FORCE RLS (ingen app.tenant_id).
 */
describe('widget/init — nøkkeloppslag uten tenant-guc', () => {
  it('resolveByPublishableKey kaller lookup_widget_key, ikke unscopet select', () => {
    const svc = les('../src/widget/service.ts');
    expect(svc).toMatch(/lookup_widget_key\(\$\{publishableKey\}::text\)/);
    expect(svc).not.toMatch(
      /from\(schema\.widgetKeys\)[\s\S]{0,200}eq\(schema\.widgetKeys\.publishableKey/,
    );
  });

  it('SQL-funksjonen og force-RLS-policyen finnes', () => {
    const functions = les('../../../packages/db/sql/functions.sql');
    const grants = les('../../../packages/db/sql/grants.sql');
    const migr = les('../../../packages/db/drizzle/0033_lookup_widget_key.sql');
    expect(functions).toMatch(/lookup_widget_key\(p_publishable_key text\)/);
    expect(functions).toMatch(/app\.widget_publishable_key/);
    expect(functions).toMatch(/security definer/i);
    expect(grants).toMatch(/widget_keys_lookup_by_pk/);
    expect(grants).toMatch(/app\.widget_publishable_key/);
    expect(migr).toMatch(/lookup_widget_key/);
    expect(migr).toMatch(/widget_keys_lookup_by_pk/);
  });

  it('Butikk-testnøkkelen tillater alltid https://endwise.no', () => {
    const svc = les('../src/widget/service.ts');
    expect(ENDWISE_APP_ORIGIN).toBe('https://endwise.no');
    expect(svc).toMatch(/ENDWISE_APP_ORIGIN/);
    expect(BUTIKK_TEST_WIDGET_LABEL).toBe('Butikk-testplassering');
    expect(originAllowed('https://endwise.no/butikk', [ENDWISE_APP_ORIGIN])).toBe(true);
  });

  it('/widget/init faller tilbake til Referer når Origin mangler', () => {
    const ruta = les('../../../apps/api/src/routes/widget/index.ts');
    expect(ruta).toMatch(/c\.req\.header\('origin'\)/);
    expect(ruta).toMatch(/c\.req\.header\('referer'\)/);
  });
});
