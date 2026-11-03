import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('0048 white-label F3-kontrakt', () => {
  const sql = les('../drizzle/0048_white_label_f3.sql');
  const journal = les('../drizzle/meta/_journal.json');
  const functions = les('../sql/functions.sql');
  const branding = les('../src/schema/tenant-branding.ts');

  it('journal har 0048 etter 0047', () => {
    expect(journal).toMatch(/0047_white_label_f2/);
    expect(journal).toMatch(/0048_white_label_f3/);
  });

  it('lookup skjuler utkast og har publisert', () => {
    expect(sql).toMatch(/lookup_tenant_by_host_rev=0048/);
    expect(sql).toMatch(/publisert boolean/);
    expect(sql).toMatch(/b\.publisert_at IS NOT NULL/);
    expect(sql).not.toMatch(/b\.utkast/);
    expect(functions).toMatch(/lookup_tenant_by_host_rev=0048/);
    expect(functions).not.toMatch(/lookup_tenant_by_host_rev=0047/);
  });

  it('logo-mime tillater ikke SVG', () => {
    expect(branding).toMatch(/image\/png/);
    expect(branding).toMatch(/image\/webp/);
    expect(branding).not.toMatch(/image\/svg/);
  });
});
