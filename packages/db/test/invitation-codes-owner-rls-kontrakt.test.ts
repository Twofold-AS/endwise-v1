import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

describe('0059 invitation_codes eier-policy', () => {
  const sql = readFileSync(resolve(her, '../drizzle/0059_invitation_codes_owner_rls.sql'), 'utf8');
  const grants = readFileSync(resolve(her, '../sql/grants.sql'), 'utf8');
  const journal = readFileSync(resolve(her, '../drizzle/meta/_journal.json'), 'utf8');

  it('journalfører 0059', () => {
    expect(journal).toMatch(/0059_invitation_codes_owner_rls/);
  });

  it('eier får SELECT/INSERT/UPDATE under FORCE RLS', () => {
    for (const kilde of [sql, grants]) {
      expect(kilde).toMatch(/invitation_codes_tenant_select_owner/);
      expect(kilde).toMatch(/invitation_codes_tenant_insert_owner/);
      expect(kilde).toMatch(/invitation_codes_tenant_update_owner/);
      expect(kilde).toMatch(/public\.invitation_codes/);
      expect(kilde).toMatch(/app\.tenant_id/);
    }
  });
});
