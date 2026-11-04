import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('0045 white-label F0-kontrakt', () => {
  const sql = les('../drizzle/0045_white_label_f0.sql');
  const journal = les('../drizzle/meta/_journal.json');
  const branding = les('../src/schema/tenant-branding.ts');
  const domains = les('../src/schema/tenant-domains.ts');
  const koder = les('../src/schema/invitation-codes.ts');
  const perms = les('../src/schema/member-permissions.ts');
  const reservert = les('../src/schema/reserverte-slugs.ts');
  const functions = les('../sql/functions.sql');

  it('journal har 0045 etter 0044', () => {
    expect(journal).toMatch(/0044_p1_residual_owner_write/);
    expect(journal).toMatch(/0045_white_label_f0/);
  });

  it('branding: navn, farger, PNG/WebP, ikke SVG, levert-av, unik tenant', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS "tenant_branding"/);
    expect(sql).toMatch(/"visningsnavn"/);
    expect(sql).toMatch(/"aksentfarge"/);
    expect(sql).toMatch(/"vis_levert_av"/);
    expect(sql).toMatch(/image\/png/);
    expect(sql).toMatch(/image\/webp/);
    expect(sql).not.toMatch(/image\/svg/);
    expect(sql).toMatch(/tenant_branding_tenant_isolation/);
    expect(branding).toMatch(/tenantPolicy\('tenant_branding'/);
    expect(branding).not.toMatch(/image\/svg/);
  });

  it('tenant_domains: unik vert, subdomene eller eget', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS "tenant_domains"/);
    expect(sql).toMatch(/tenant_domains_vert_uidx/);
    expect(sql).toMatch(/subdomene/);
    expect(domains).toMatch(/tenantPolicy\('tenant_domains'/);
  });

  it('invitation_codes: hash, forsøk, utløp, used_at — ikke klartekst-kode', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS "invitation_codes"/);
    expect(sql).toMatch(/"code_hash"/);
    expect(sql).toMatch(/"code_salt"/);
    expect(sql).toMatch(/"attempts"/);
    expect(sql).toMatch(/"expires_at"/);
    expect(sql).toMatch(/"used_at"/);
    expect(sql).not.toMatch(/"code" text/);
    expect(koder).toMatch(/tenantPolicy\('invitation_codes'/);
  });

  it('member_permissions: område + se|endre + tenant-RLS', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS "member_permissions"/);
    expect(sql).toMatch(/'bookinger'/);
    expect(sql).toMatch(/'se','endre'/);
    expect(perms).toMatch(/tenantPolicy\('member_permissions'/);
  });

  it('reserverte_slugs: platform-admin RLS og seed', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS "reserverte_slugs"/);
    expect(sql).toMatch(/reserverte_slugs_platform_admin/);
    expect(sql).toMatch(/\('platform', 'skjult admin'\)/);
    expect(reservert).toMatch(/app\.platform_admin/);
  });

  it('seeder reserverte_slugs før FORCE RLS (eier under FORCE = 42501)', () => {
    const create = sql.indexOf('CREATE TABLE IF NOT EXISTS "reserverte_slugs"');
    const insert = sql.indexOf('INSERT INTO "reserverte_slugs"');
    const force = sql.indexOf('ALTER TABLE "reserverte_slugs" FORCE ROW LEVEL SECURITY');
    expect(create).toBeGreaterThan(-1);
    expect(insert).toBeGreaterThan(create);
    expect(force).toBeGreaterThan(insert);
  });

  it('FORCE RLS + GRANT på alle nye tenant-tabeller', () => {
    for (const t of [
      'tenant_branding',
      'tenant_domains',
      'invitation_codes',
      'member_permissions',
      'reserverte_slugs',
    ]) {
      expect(sql).toMatch(new RegExp(`ALTER TABLE "${t}" FORCE ROW LEVEL SECURITY`));
      expect(sql).toMatch(
        new RegExp(`GRANT SELECT, INSERT, UPDATE, DELETE ON "${t}" TO authenticated`),
      );
    }
  });

  it('RLS-skisse for lookup_tenant_by_host og app.actor står i utkastet', () => {
    expect(sql).toMatch(/lookup_tenant_by_host/);
    expect(sql).toMatch(/app\.actor/);
    expect(sql).toMatch(/SECURITY DEFINER/);
  });

  it('slett_forhandler kjenner de nye tabellene før shop', () => {
    const start = functions.indexOf("'invitation_codes', 'member_permissions'");
    const shop = functions.indexOf("'shop_order_lines', 'shop_orders'");
    expect(start).toBeGreaterThan(-1);
    expect(shop).toBeGreaterThan(start);
  });
});
