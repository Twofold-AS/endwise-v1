import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('0061 white-label F40-kontrakt', () => {
  const sql = les('../drizzle/0061_white_label_f40.sql');
  const journal = les('../drizzle/meta/_journal.json');
  const functions = les('../sql/functions.sql');

  it('journalfører 0061 etter 0060', () => {
    expect(journal).toMatch(/0060_white_label_f39/);
    expect(journal).toMatch(/0061_white_label_f40/);
    expect(journal.indexOf('0060_white_label_f39')).toBeLessThan(
      journal.indexOf('0061_white_label_f40'),
    );
  });

  it('lookup hopper over www, app, platform, api', () => {
    expect(sql).toMatch(/lookup_tenant_by_host_rev=0061/);
    expect(sql).toMatch(/v_slug IN \('www', 'app', 'platform', 'api', 'endwise', ''\)/);
    expect(functions).toMatch(/lookup_tenant_by_host_rev=0061/);
    expect(functions).toMatch(/v_slug in \('www', 'app', 'platform', 'api', 'endwise', ''\)/);
  });
});
