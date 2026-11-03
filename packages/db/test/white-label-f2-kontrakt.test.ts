import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('0047 white-label F2-kontrakt', () => {
  const sql = les('../drizzle/0047_white_label_f2.sql');
  const journal = les('../drizzle/meta/_journal.json');
  const functions = les('../sql/functions.sql');
  const grants = les('../sql/grants.sql');

  it('journal har 0047 etter 0046', () => {
    expect(journal).toMatch(/0046_white_label_f1/);
    expect(journal).toMatch(/0047_white_label_f2/);
  });

  it('lookup_tenant_by_host er SECURITY DEFINER uten tenant-id', () => {
    expect(sql).toMatch(/CREATE FUNCTION lookup_tenant_by_host/);
    expect(sql).toMatch(/SECURITY DEFINER/);
    expect(sql).toMatch(/lookup_tenant_by_host_rev=0047/);
    expect(sql).not.toMatch(/RETURNS TABLE \([^)]*tenant_id/i);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION lookup_tenant_by_host\(text, text\) TO PUBLIC/);
    expect(functions).toMatch(/lookup_tenant_by_host_rev=004[78]/);
  });

  it('DEFINER-policyer er TO PUBLIC og eier-only', () => {
    expect(sql).toMatch(/tenants_host_oppslag/);
    expect(sql).toMatch(/tenant_branding_host_oppslag/);
    expect(sql).toMatch(/app\.slug_sjekk/);
    expect(sql).toMatch(/app\.host_oppslag/);
    expect(sql).toMatch(/current_user IS DISTINCT FROM 'authenticated'/);
    expect(grants).toMatch(/tenants_host_oppslag/);
    expect(grants).toMatch(/app\.host_oppslag/);
  });
});
