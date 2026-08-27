import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('0030 dealer_profile-kontrakt', () => {
  const sql = les('../drizzle/0030_dealer_profile.sql');
  const schema = les('../src/schema/dealer-profile.ts');
  const journal = les('../drizzle/meta/_journal.json');
  const functions = les('../sql/functions.sql');

  it('journal har 0030_dealer_profile etter 0029', () => {
    expect(journal).toMatch(/0029_shop_internal/);
    expect(journal).toMatch(/0030_dealer_profile/);
  });

  it('tabellen har butikkfelt + quick_client jsonb, tenant-RLS og inspect-SELECT', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS "dealer_profiles"/);
    expect(sql).toMatch(/"orgnr"/);
    expect(sql).toMatch(/"address"/);
    expect(sql).toMatch(/"postal_code"/);
    expect(sql).toMatch(/"city"/);
    expect(sql).toMatch(/"phone"/);
    expect(sql).toMatch(/"email"/);
    expect(sql).toMatch(/"website"/);
    expect(sql).toMatch(/"quick_client" jsonb/);
    expect(sql).toMatch(/dealer_profiles_tenant_isolation/);
    expect(sql).toMatch(/dealer_profiles_platform_inspect_read/);
    expect(schema).toMatch(/tenantPolicy\('dealer_profiles'/);
    expect(schema).toMatch(/inspectSelectPolicy\('dealer_profiles'/);
  });

  it('slett_forhandler kjenner dealer_profiles', () => {
    expect(functions).toMatch(/'dealer_profiles'/);
  });

  it('0031 GRANTer authenticated (prod kan ha kjørt 0030 uten db:grants)', () => {
    const grant = les('../drizzle/0031_dealer_profile_grant.sql');
    expect(journal).toMatch(/0031_dealer_profile_grant/);
    expect(grant).toMatch(/CREATE TABLE IF NOT EXISTS "dealer_profiles"/);
    expect(grant).toMatch(
      /GRANT SELECT, INSERT, UPDATE, DELETE ON "dealer_profiles" TO authenticated/i,
    );
    expect(grant).toMatch(/FORCE ROW LEVEL SECURITY/);
    expect(grant).toMatch(/dealer_profiles_tenant_isolation/);
    expect(grant).not.toMatch(/sell_price_minor|sellPriceMinor/);
  });
});
