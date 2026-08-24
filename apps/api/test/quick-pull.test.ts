import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * F1-07 / F8-01 — pull er GET-only, token blir på server, ingen Fixie/proxy.
 */
describe('Quick-pull: GET-only inn i Postgres', () => {
  const her = dirname(fileURLToPath(import.meta.url));
  const pull = readFileSync(resolve(her, '../src/lib/quick-pull.ts'), 'utf8');
  const router = readFileSync(resolve(her, '../src/trpc/routers/quick.ts'), 'utf8');
  const client = readFileSync(
    resolve(her, '../../../packages/tools/toolkits/quick/src/client.ts'),
    'utf8',
  );

  it('hent nå kjører kunder og deler/lager', () => {
    expect(pull).toMatch(/iterateItems/);
    expect(pull).toMatch(/iterateStockEntries/);
    expect(pull).toMatch(/syncQuickParts/);
    expect(pull).toMatch(/iterateCustomers/);
    expect(router).toMatch(/parts:/);
    expect(router).toMatch(/stock:/);
    expect(router).toMatch(/runQuickCustomerPull/);
  });

  it('klienten er GET-only mot Quick — ingen POST/PUT/PATCH/DELETE', () => {
    expect(client).toMatch(/method:\s*['"]GET['"]/);
    expect(client).not.toMatch(/['"]POST['"]/);
    expect(client).not.toMatch(/['"]PUT['"]/);
    expect(client).not.toMatch(/['"]PATCH['"]/);
    expect(client).not.toMatch(/['"]DELETE['"]/);
    expect(client).toMatch(/\/item\/batch/);
    expect(client).toMatch(/\/stockentry\/batch/);
    expect(client).toMatch(/\/customer\/batch/);
  });

  it('ingen Fixie, Scaleway-VM-proxy eller browser-token', () => {
    expect(`${pull}\n${router}\n${client}`).not.toMatch(
      /process\.env\.(FIXIE|HTTPS_PROXY|HTTP_PROXY|FIXIE_URL)/,
    );
    expect(router).toMatch(/hasToken/);
    expect(router).not.toMatch(/token:\s*cfg\.token/);
    expect(pull).not.toMatch(/console\.(log|info|debug)\([^)]*token/i);
  });
});
