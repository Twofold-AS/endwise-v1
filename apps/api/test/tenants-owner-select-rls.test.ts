import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Prod (endwise.no): APP_DATABASE_URL kobler som eier `endwise` under
 * FORCE RLS. withTenant setter bare app.tenant_id — ikke platform_admin.
 * tenants_self_isolation er TO authenticated. tenants_platform_admin_read_owner
 * krever platform_admin og åpner ALLE tenants. Uten tenant-scopet eier-SELECT
 * ser lesTenantNavn 0 rader → forhandler.kort / onboarding.fullfor NOT_FOUND
 * «Fant ikke forhandleren». Samme klasse som #121 invitations RETURNING.
 */

const her = dirname(fileURLToPath(import.meta.url));
const grants = readFileSync(resolve(her, '../../../packages/db/sql/grants.sql'), 'utf8');
const grantsTs = readFileSync(resolve(her, '../../../packages/db/scripts/grants.ts'), 'utf8');
const client = readFileSync(resolve(her, '../../../packages/db/src/client.ts'), 'utf8');
const forhandler = readFileSync(resolve(her, '../src/trpc/routers/forhandler.ts'), 'utf8');
const onboarding = readFileSync(resolve(her, '../src/trpc/routers/onboarding.ts'), 'utf8');
const session = readFileSync(resolve(her, '../src/trpc/routers/session.ts'), 'utf8');
const forceRls = readFileSync(resolve(her, '../../../packages/db/test/force-rls.test.ts'), 'utf8');
const journal = readFileSync(
  resolve(her, '../../../packages/db/drizzle/meta/_journal.json'),
  'utf8',
);
const m0039 = readFileSync(
  resolve(her, '../../../packages/db/drizzle/0039_tenants_owner_select.sql'),
  'utf8',
);
const liveTest = readFileSync(
  resolve(her, '../../../packages/db/test/tenants-owner-select.test.ts'),
  'utf8',
);
const vitestCfg = readFileSync(resolve(her, '../../../packages/db/vitest.config.ts'), 'utf8');

function policyKropp(sql: string, navn: string): string {
  const start = sql.indexOf(`create policy ${navn}`);
  expect(start, `mangler create policy ${navn}`).toBeGreaterThan(-1);
  const etter = sql.slice(start);
  const slutt = etter.search(/\n(?:drop policy|create policy|-- )/);
  return slutt === -1 ? etter : etter.slice(0, slutt);
}

function assertEierTenantSelect(sql: string, navn: string, idKolonne: 'id' | 'tenant_id') {
  const kropp = policyKropp(sql, navn);
  expect(kropp).toMatch(/for select/);
  expect(kropp).toMatch(/to public/);
  expect(kropp).toMatch(/current_user is distinct from 'authenticated'/);
  expect(kropp).toMatch(/current_user is distinct from 'endwise_app'/);
  expect(kropp).toMatch(/pg_get_userbyid|relowner/);
  expect(kropp).toMatch(/nullif\(current_setting\('app\.tenant_id', true\), ''\) is not null/);
  expect(kropp).toMatch(
    new RegExp(`${idKolonne} = nullif\\(current_setting\\('app\\.tenant_id', true\\), ''\\)::uuid`),
  );
  expect(kropp).not.toMatch(/app\.platform_admin/);
  expect(kropp).not.toMatch(/for insert/);
  expect(kropp).not.toMatch(/for update/);
  expect(kropp).not.toMatch(/for delete/);
  expect(kropp).not.toMatch(/for all/);
  expect(kropp).not.toMatch(/disable row level security/i);
  expect(kropp).not.toMatch(/no force row level security/i);
}

describe('FORCE RLS eier-SELECT på withTenant (prod-rolle endwise)', () => {
  it('tenants: TO PUBLIC SELECT for eier, kun egen tenant-guc (ikke platform_admin)', () => {
    assertEierTenantSelect(grants, 'tenants_tenant_select_owner', 'id');
    assertEierTenantSelect(m0039, 'tenants_tenant_select_owner', 'id');
  });

  it('dealer_profiles: samme eier-SELECT (forhandler.kort)', () => {
    assertEierTenantSelect(grants, 'dealer_profiles_tenant_select_owner', 'tenant_id');
    assertEierTenantSelect(m0039, 'dealer_profiles_tenant_select_owner', 'tenant_id');
  });

  it('session.me / onboarding-leser tenant_modules, member_profiles, mechanics', () => {
    assertEierTenantSelect(grants, 'tenant_modules_tenant_select_owner', 'tenant_id');
    assertEierTenantSelect(grants, 'member_profiles_tenant_select_owner', 'tenant_id');
    assertEierTenantSelect(grants, 'mechanics_tenant_select_owner', 'tenant_id');
    expect(m0039).toMatch(/tenant_modules_tenant_select_owner/);
    expect(m0039).toMatch(/member_profiles_tenant_select_owner/);
    expect(m0039).toMatch(/mechanics_tenant_select_owner/);
  });

  it('withTenant setter kun app.tenant_id — ikke platform_admin (CWE-863)', () => {
    const start = client.indexOf('export async function withTenant');
    expect(start).toBeGreaterThan(-1);
    const kropp = client.slice(start, start + 420);
    expect(kropp).toMatch(/set_config\(\$\{APP_TENANT_SETTING\}, \$\{tenantId\}, true\)/);
    expect(kropp).not.toMatch(/set_config\('app\.platform_admin'/);
    expect(kropp).not.toMatch(/APP_PLATFORM|platform_admin', 'on'/);
  });

  it('forhandler.kort og onboarding.fullfor leser tenants inne i withTenant', () => {
    expect(forhandler).toMatch(/lesTenantNavn/);
    expect(forhandler).toMatch(/from\(schema\.tenants\)/);
    expect(forhandler).toMatch(/Fant ikke forhandleren/);
    expect(forhandler).toMatch(/withTenant\(ctx\.db, ctx\.tenantId/);
    expect(forhandler).toMatch(/from\(schema\.dealerProfiles\)/);
    expect(onboarding).toMatch(/from\(schema\.tenants\)/);
    expect(onboarding).toMatch(/Fant ikke forhandleren/);
    expect(onboarding).toMatch(/withTenant\(ctx\.db, ctx\.tenantId/);
    expect(session).toMatch(/from\(schema\.tenants\)/);
    expect(session).toMatch(/from\(schema\.tenantModules\)/);
    expect(session).toMatch(/from\(schema\.memberProfiles\)/);
    expect(session).toMatch(/from\(schema\.mechanics\)/);
  });

  it('0039 + db:grants krever eier-SELECT, skrur ikke av FORCE RLS', () => {
    expect(journal).toMatch(/0039_tenants_owner_select/);
    expect(grantsTs).toMatch(/tenants_tenant_select_owner/);
    expect(grantsTs).toMatch(/dealer_profiles_tenant_select_owner/);
    expect(grantsTs).toMatch(/tenant_modules_tenant_select_owner/);
    expect(grantsTs).toMatch(/member_profiles_tenant_select_owner/);
    expect(grantsTs).toMatch(/mechanics_tenant_select_owner/);
    expect(grantsTs).toMatch(/process\.exit\(1\)/);
    expect(grants).toMatch(/force row level security/);
    expect(grants).not.toMatch(/no force row level security/i);
    expect(m0039).not.toMatch(/disable row level security/i);
    expect(m0039).not.toMatch(/no force row level security/i);
  });

  it('force-rls-testen krever at eier-SELECT-policyene finnes i runtime', () => {
    expect(forceRls).toMatch(/tenants_tenant_select_owner/);
    expect(forceRls).toMatch(/dealer_profiles_tenant_select_owner/);
  });

  it('SET ROLE endwise-regresjon finnes og kjøres i db-suiten', () => {
    expect(liveTest).toMatch(/SET ROLE endwise|set local role endwise/i);
    expect(liveTest).toMatch(/app\.tenant_id/);
    expect(liveTest).toMatch(/app\.platform_admin/);
    expect(vitestCfg).toMatch(/tenants-owner-select\.test\.ts/);
  });

  it('eksisterende platform_admin-read_owner er uendret (alle tenants)', () => {
    const kropp = policyKropp(grants, 'tenants_platform_admin_read_owner');
    expect(kropp).toMatch(/for select/);
    expect(kropp).toMatch(/app\.platform_admin/);
    expect(kropp).not.toMatch(/app\.tenant_id/);
  });
});
