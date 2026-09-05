import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Prod a8099a5 (#125): 0039 eier-SELECT + 0040 member_profiles.
 * onboarding.fullfor NOT_FOUND kommer fra SELECT (lesTenantNavn), ikke
 * UPDATE. Mons rest: eier-UPDATE på tenants/tenant_modules mangler.
 * Team-steg: invitasjoner.opprett INSERT … RETURNING uten platform_admin.
 */

const her = dirname(fileURLToPath(import.meta.url));
const grants = readFileSync(resolve(her, '../../../packages/db/sql/grants.sql'), 'utf8');
const grantsTs = readFileSync(resolve(her, '../../../packages/db/scripts/grants.ts'), 'utf8');
const functionsSql = readFileSync(resolve(her, '../../../packages/db/sql/functions.sql'), 'utf8');
const client = readFileSync(resolve(her, '../../../packages/db/src/client.ts'), 'utf8');
const onboarding = readFileSync(resolve(her, '../src/trpc/routers/onboarding.ts'), 'utf8');
const forhandler = readFileSync(resolve(her, '../src/trpc/routers/forhandler.ts'), 'utf8');
const invitasjoner = readFileSync(
  resolve(her, '../../../packages/modules/src/invitasjoner/index.ts'),
  'utf8',
);
const journal = readFileSync(
  resolve(her, '../../../packages/db/drizzle/meta/_journal.json'),
  'utf8',
);
const m0041 = readFileSync(
  resolve(her, '../../../packages/db/drizzle/0041_tenants_owner_update.sql'),
  'utf8',
);
const liveTest = readFileSync(
  resolve(her, '../../../packages/db/test/tenants-owner-update.test.ts'),
  'utf8',
);
const vitestCfg = readFileSync(resolve(her, '../../../packages/db/vitest.config.ts'), 'utf8');
const forceRls = readFileSync(resolve(her, '../../../packages/db/test/force-rls.test.ts'), 'utf8');

function policyKropp(sql: string, navn: string): string {
  const start = sql.indexOf(`create policy ${navn}`);
  expect(start, `mangler create policy ${navn}`).toBeGreaterThan(-1);
  const etter = sql.slice(start);
  const slutt = etter.search(/\n(?:drop policy|create policy|-- )/);
  return slutt === -1 ? etter : etter.slice(0, slutt);
}

function assertEierTenantUpdate(sql: string, navn: string, idKolonne: 'id' | 'tenant_id') {
  const kropp = policyKropp(sql, navn);
  expect(kropp).toMatch(/for update/);
  expect(kropp).toMatch(/to public/);
  expect(kropp).toMatch(/current_user is distinct from 'authenticated'/);
  expect(kropp).toMatch(/current_user is distinct from 'endwise_app'/);
  expect(kropp).toMatch(/pg_get_userbyid|relowner/);
  expect(kropp).toMatch(/nullif\(current_setting\('app\.tenant_id', true\), ''\) is not null/);
  expect(kropp).toMatch(
    new RegExp(`${idKolonne} = nullif\\(current_setting\\('app\\.tenant_id', true\\), ''\\)::uuid`),
  );
  expect(kropp).toMatch(/with check/);
  expect(kropp).not.toMatch(/app\.platform_admin/);
  expect(kropp).not.toMatch(/for insert/);
  expect(kropp).not.toMatch(/for select/);
  expect(kropp).not.toMatch(/for delete/);
  expect(kropp).not.toMatch(/for all/);
  expect(kropp).not.toMatch(/disable row level security/i);
  expect(kropp).not.toMatch(/no force row level security/i);
}

describe('FORCE RLS eier-UPDATE på onboarding.fullfor (prod-rolle endwise)', () => {
  it('0039/0040 GUC matcher withTenant (uuid cast, nullif, current_user=relowner)', () => {
    const start = client.indexOf('export async function withTenant');
    expect(start).toBeGreaterThan(-1);
    const kropp = client.slice(start, start + 420);
    expect(kropp).toMatch(/set_config\(\$\{APP_TENANT_SETTING\}, \$\{tenantId\}, true\)/);
    expect(kropp).not.toMatch(/set_config\('app\.platform_admin'/);
    expect(grants).toMatch(/id = nullif\(current_setting\('app\.tenant_id', true\), ''\)::uuid/);
    expect(grants).toMatch(
      /tenant_id = nullif\(current_setting\('app\.tenant_id', true\), ''\)::uuid/,
    );
  });

  it('onboarding.fullfor NOT_FOUND er SELECT før UPDATE (ikke silent 0-rad UPDATE)', () => {
    const sel = onboarding.indexOf('from(schema.tenants)');
    const notFound = onboarding.indexOf("code: 'NOT_FOUND', message: 'Fant ikke forhandleren'");
    const upd = onboarding.indexOf('.update(schema.tenants)');
    expect(sel).toBeGreaterThan(-1);
    expect(notFound).toBeGreaterThan(sel);
    expect(upd).toBeGreaterThan(notFound);
    expect(onboarding).toMatch(/update\(schema\.tenantModules\)/);
    expect(forhandler).toMatch(/lesTenantNavn/);
  });

  it('tenants + tenant_modules: TO PUBLIC UPDATE for eier, kun egen tenant-guc', () => {
    assertEierTenantUpdate(grants, 'tenants_tenant_update_owner', 'id');
    assertEierTenantUpdate(grants, 'tenant_modules_tenant_update_owner', 'tenant_id');
    assertEierTenantUpdate(m0041, 'tenants_tenant_update_owner', 'id');
    assertEierTenantUpdate(m0041, 'tenant_modules_tenant_update_owner', 'tenant_id');
  });

  it('staff-invite RETURNING: eier-SELECT på invitations uten platform_admin', () => {
    const kroppGrants = policyKropp(grants, 'invitations_tenant_select_owner');
    const kroppMig = policyKropp(m0041, 'invitations_tenant_select_owner');
    for (const kropp of [kroppGrants, kroppMig]) {
      expect(kropp).toMatch(/for select/);
      expect(kropp).toMatch(/to public/);
      expect(kropp).toMatch(/relowner/);
      expect(kropp).toMatch(/app\.tenant_id/);
      expect(kropp).not.toMatch(/app\.platform_admin/);
    }
    expect(invitasjoner).toMatch(/insert\(schema\.invitations\)/);
    expect(invitasjoner).toMatch(/\.returning\(\)/);
    expect(invitasjoner).toMatch(/kind: 'staff'/);
  });

  it('0041 + db:grants krever eier-UPDATE, skrur ikke av FORCE RLS', () => {
    expect(journal).toMatch(/0041_tenants_owner_update/);
    expect(grantsTs).toMatch(/tenants_tenant_update_owner/);
    expect(grantsTs).toMatch(/tenant_modules_tenant_update_owner/);
    expect(grantsTs).toMatch(/invitations_tenant_select_owner/);
    expect(grants).toMatch(/force row level security/);
    expect(grants).not.toMatch(/no force row level security/i);
    expect(m0041).not.toMatch(/disable row level security/i);
    expect(m0041).not.toMatch(/no force row level security/i);
    expect(forceRls).toMatch(/tenants_tenant_update_owner/);
  });

  it('trigger låser PK/created_at og nekter kind=platform (ikke blanket eier-skriv)', () => {
    expect(functionsSql).toMatch(/tenants_owner_update_guard/);
    expect(functionsSql).toMatch(/tenant_modules_owner_update_guard/);
    expect(m0041).toMatch(/tenants_owner_update_guard/);
    expect(m0041).toMatch(/new\.kind = 'platform'/);
    expect(m0041).toMatch(/new\.id is distinct from old\.id/);
    expect(m0041).toMatch(/new\.tenant_id is distinct from old\.tenant_id/);
  });

  it('SET ROLE-regresjon: fullfor UPDATE + tom GUC avvist', () => {
    expect(liveTest).toMatch(/SET ROLE endwise|set local role/i);
    expect(liveTest).toMatch(/app\.tenant_id/);
    expect(liveTest).toMatch(/onboarding_completed_at/);
    expect(liveTest).toMatch(/uten tenant-GUC|tom tenant-GUC|empty GUC/i);
    expect(vitestCfg).toMatch(/tenants-owner-update\.test\.ts/);
  });
});
