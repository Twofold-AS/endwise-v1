import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));
function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('0056 white-label F13-kontrakt', () => {
  const sql = les('../drizzle/0056_white_label_f13.sql');
  const schema = les('../src/schema/shared-assets.ts');
  const functions = les('../sql/functions.sql');

  it('journal har 0056 etter 0055', () => {
    const journal = les('../drizzle/meta/_journal.json');
    expect(journal).toMatch(/0056_white_label_f13/);
  });

  it('delingstabeller uten kunde/kjøretøy/regnr', () => {
    expect(schema).toMatch(/tenantAgreements/);
    expect(schema).toMatch(/sharedAssets/);
    expect(schema).toMatch(/sharedAssetOrigin/);
    expect(schema).not.toMatch(/customerId/);
    expect(schema).not.toMatch(/vehicleId/);
    expect(schema).not.toMatch(/regNumber/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS "shared_assets"/);
    expect(sql).not.toMatch(/customer_id/);
    expect(sql).not.toMatch(/vehicle_id/);
  });

  it('publiser_delt_asset er SECURITY DEFINER og krever samtykke', () => {
    expect(sql).toMatch(/CREATE FUNCTION publiser_delt_asset/);
    expect(sql).toMatch(/SECURITY DEFINER/);
    expect(sql).toMatch(/ikke samtykke/);
    expect(sql).toMatch(/REVOKE INSERT, UPDATE, DELETE ON "shared_assets"/);
    expect(functions).toMatch(/publiser_delt_asset_rev=0056/);
    expect(sql).toMatch(/slett_trukket_shared_assets/);
    expect(sql).toMatch(/interval '30 days'/);
  });

  it('opprinnelse er skjult for andre tenants', () => {
    expect(sql).toMatch(/shared_asset_origin_own/);
    expect(sql).toMatch(/origin_tenant_id" = nullif\(current_setting\('app.tenant_id'/);
    expect(schema).toMatch(/app.platform_admin/);
  });
});
