import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('0046 white-label F1-kontrakt', () => {
  const sql = les('../drizzle/0046_white_label_f1.sql');
  const journal = les('../drizzle/meta/_journal.json');
  const history = les('../src/schema/tenant-slug-history.ts');
  const functions = les('../sql/functions.sql');
  const grants = les('../sql/grants.sql');

  it('journal har 0046 etter 0045', () => {
    expect(journal).toMatch(/0045_white_label_f0/);
    expect(journal).toMatch(/0046_white_label_f1/);
  });

  it('tenant_slug_history og slug_reservations med FORCE RLS', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS "tenant_slug_history"/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS "slug_reservations"/);
    expect(sql).toMatch(/"omdirigerer_til_slug"/);
    expect(sql).toMatch(/"holder"/);
    expect(sql).toMatch(/ALTER TABLE "tenant_slug_history" FORCE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/ALTER TABLE "slug_reservations" FORCE ROW LEVEL SECURITY/);
    expect(history).toMatch(/tenantPolicy\('tenant_slug_history'/);
    expect(history).toMatch(/slug_reservations_ingen_direkte/);
  });

  it('lower(slug) unik mot tenants og organization', () => {
    expect(sql).toMatch(/tenants_slug_lower_uidx/);
    expect(sql).toMatch(/organization_slug_lower_uidx/);
    expect(sql).toMatch(/ON "tenants" \(lower\("slug"\)\)/);
    expect(sql).toMatch(/ON "organization" \(lower\("slug"\)\)/);
  });

  it('slug_ledig og reserver_slug er SECURITY DEFINER', () => {
    expect(sql).toMatch(/CREATE FUNCTION slug_ledig/);
    expect(sql).toMatch(/CREATE FUNCTION reserver_slug/);
    expect(sql).toMatch(/SECURITY DEFINER/);
    expect(sql).toMatch(/slug_ledig_rev=0046/);
    expect(sql).toMatch(/reserver_slug_rev=0046/);
    expect(sql).toMatch(/ON CONFLICT \(slug\)/);
    expect(functions).toMatch(/slug_ledig_rev=0046/);
    expect(functions).toMatch(/reserver_slug_rev=0046/);
  });

  it('DEFINER-policyer er TO PUBLIC og eier-only', () => {
    expect(sql).toMatch(/reserverte_slugs_slug_oppslag/);
    expect(sql).toMatch(/tenants_slug_oppslag/);
    expect(sql).toMatch(/app\.slug_sjekk/);
    expect(sql).toMatch(/current_user IS DISTINCT FROM 'authenticated'/);
    expect(grants).toMatch(/slug_reservations_definer/);
    expect(grants).toMatch(/app\.slug_sjekk/);
  });

  it('slett_forhandler kjenner history og reservations', () => {
    expect(functions).toMatch(/'tenant_slug_history'/);
    expect(functions).toMatch(/delete from slug_reservations where slug = v_slug/i);
    expect(functions).not.toMatch(/'tenant_slug_history', 'slug_reservations'/);
  });
});
