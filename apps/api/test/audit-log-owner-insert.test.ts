import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Prod (endwise.no): APP_DATABASE_URL kobler som eier `endwise` gjennom
 * PgBouncer :6432, ikke som `endwise_app`. FORCE RLS gjelder eieren.
 *
 * To 500-ere, samme klasse:
 * 1. flags.setGlobal → insert audit_log (feature_flag.set_global).
 *    withTenant setter app.tenant_id; TO authenticated-policyen gjelder
 *    ikke eieren. `audit_log_slett_insert` krever slett-GUC.
 * 2. tenants.create → insert tenants (live dealer). withTenant setter
 *    app.tenant_id til NY id; tenants_platform_admin_read_owner er
 *    SELECT-only. INSERT/UPDATE som eier nektes selv med platform_admin
 *    + tenant_id satt — inntil en eier-INSERT-policy finnes.
 *
 * Docker-eieren er superuser og bypasser FORCE RLS, så disse
 * kildetestene er stand-in (samme klasse som slett-forhandler-sql.test.ts).
 */

const her = dirname(fileURLToPath(import.meta.url));
const grants = readFileSync(resolve(her, '../../../packages/db/sql/grants.sql'), 'utf8');
const grantsTs = readFileSync(resolve(her, '../../../packages/db/scripts/grants.ts'), 'utf8');
const auditSchema = readFileSync(resolve(her, '../../../packages/db/src/schema/audit.ts'), 'utf8');
const tenantsSchema = readFileSync(
  resolve(her, '../../../packages/db/src/schema/tenants.ts'),
  'utf8',
);
const flagsRouter = readFileSync(resolve(her, '../src/trpc/routers/flags.ts'), 'utf8');
const tenantsRouter = readFileSync(resolve(her, '../src/trpc/routers/tenants.ts'), 'utf8');
const createTenant = readFileSync(resolve(her, '../../../packages/auth/src/tenant.ts'), 'utf8');
const forceRls = readFileSync(resolve(her, '../../../packages/db/test/force-rls.test.ts'), 'utf8');
const journal = readFileSync(
  resolve(her, '../../../packages/db/drizzle/meta/_journal.json'),
  'utf8',
);
const m0037 = readFileSync(
  resolve(her, '../../../packages/db/drizzle/0037_owner_rls_insert.sql'),
  'utf8',
);

function policyKropp(sql: string, navn: string): string {
  const start = sql.indexOf(`create policy ${navn}`);
  expect(start, `mangler create policy ${navn}`).toBeGreaterThan(-1);
  const etter = sql.slice(start);
  const slutt = etter.search(/\n(?:drop policy|create policy) /);
  return slutt === -1 ? etter : etter.slice(0, slutt);
}

function assertEierInsert(sql: string, navn: string, extra: RegExp[]) {
  const kropp = policyKropp(sql, navn);
  expect(kropp).toMatch(/for insert/);
  expect(kropp).toMatch(/to public/);
  expect(kropp).toMatch(/current_user is distinct from 'authenticated'/);
  expect(kropp).toMatch(/current_user is distinct from 'endwise_app'/);
  expect(kropp).toMatch(/with check \(/);
  expect(kropp).not.toMatch(/with check \(true\)/i);
  expect(kropp).not.toMatch(/for update/);
  expect(kropp).not.toMatch(/for delete/);
  expect(kropp).not.toMatch(/for all/);
  for (const re of extra) expect(kropp, navn).toMatch(re);
}

describe('FORCE RLS eier-INSERT (prod-rolle endwise)', () => {
  it('audit_log: TO PUBLIC INSERT for eier (tenant-guc, ikke slett-guc)', () => {
    assertEierInsert(grants, 'audit_log_tenant_insert_owner', [
      /app\.tenant_id/,
      /app\.platform_admin/,
    ]);
    const kropp = policyKropp(grants, 'audit_log_tenant_insert_owner');
    expect(kropp).not.toMatch(/app\.slett_tenant_id/);
  });

  it('tenants: TO PUBLIC INSERT for eier (platform_admin, ikke bare SELECT)', () => {
    assertEierInsert(grants, 'tenants_platform_admin_insert_owner', [/app\.platform_admin/]);
    const kropp = policyKropp(grants, 'tenants_platform_admin_insert_owner');
    expect(kropp).not.toMatch(/app\.slett_tenant_id/);
    expect(grants).toMatch(/tenants_platform_admin_read_owner/);
  });

  it('tenant_modules: TO PUBLIC INSERT for eier (create skriver pakke-rader)', () => {
    assertEierInsert(grants, 'tenant_modules_platform_admin_insert_owner', [
      /app\.platform_admin/,
      /app\.tenant_id/,
    ]);
  });

  it('invitations: TO PUBLIC INSERT for eier (create kaller opprettEier)', () => {
    assertEierInsert(grants, 'invitations_platform_admin_insert_owner', [
      /app\.tenant_id/,
      /app\.platform_admin/,
    ]);
  });

  it('skrur ikke av RLS eller FORCE RLS', () => {
    expect(grants).not.toMatch(/alter table\s+audit_log\s+disable row level security/i);
    expect(grants).not.toMatch(/alter table\s+tenants\s+disable row level security/i);
    expect(grants).not.toMatch(/no force row level security/i);
    expect(grants).toMatch(/force row level security/);
  });

  it('beholder append-only for authenticated på audit_log', () => {
    expect(auditSchema).toMatch(/audit_log_tenant_insert/);
    expect(auditSchema).toMatch(/audit_log_tenant_read/);
    expect(auditSchema).not.toMatch(/for:\s*'update'/);
    expect(auditSchema).not.toMatch(/for:\s*'delete'/);
    expect(auditSchema).toMatch(/audit_log_tenant_insert_owner/);
  });

  it('tenants-skjemaet peker på eier-INSERT i grants (ikke TO authenticated her)', () => {
    expect(tenantsSchema).toMatch(/tenants_platform_admin_insert_owner/);
    expect(tenantsSchema).toMatch(/tenants_platform_admin_read_owner/);
  });

  it('setGlobal / tenant.deleted / tenant.created hopper ikke over audit', () => {
    expect(flagsRouter).toMatch(/action:\s*'feature_flag\.set_global'/);
    expect(flagsRouter).toMatch(/skrivFlagAudit/);
    expect(flagsRouter).toMatch(/withTenant\(ctx\.db, ctx\.tenantId/);
    expect(tenantsRouter).toMatch(/action:\s*'tenant\.deleted'/);
    expect(tenantsRouter).toMatch(/action:\s*'tenant\.created'/);
    expect(tenantsRouter).toMatch(/skrivEntitlementAudit/);
    expect(tenantsRouter).toMatch(/withTenant\(ctx\.db, ctx\.tenantId/);
    expect(tenantsRouter).not.toMatch(/skip.*audit|uten audit/i);
  });

  it('createTenant setter platform_admin i samme tx som tenants-INSERT', () => {
    expect(createTenant).toMatch(/withTenant\(db, tenantId/);
    expect(createTenant).toMatch(/app\.platform_admin/);
    expect(createTenant).toMatch(/insert\(schema\.tenants\)/);
    const insertAt = createTenant.search(/insert\(schema\.tenants\)/);
    const gucAt = createTenant.search(/app\.platform_admin/);
    expect(gucAt).toBeGreaterThan(-1);
    expect(gucAt).toBeLessThan(insertAt);
  });

  it('0037 tetter eier-INSERT (idempotent) og står i journalen', () => {
    expect(journal).toMatch(/0037_owner_rls_insert/);
    expect(m0037).toMatch(/drop policy if exists audit_log_tenant_insert_owner/i);
    expect(m0037).toMatch(/create policy audit_log_tenant_insert_owner/i);
    expect(m0037).toMatch(/drop policy if exists tenants_platform_admin_insert_owner/i);
    expect(m0037).toMatch(/create policy tenants_platform_admin_insert_owner/i);
    expect(m0037).toMatch(/drop policy if exists tenant_modules_platform_admin_insert_owner/i);
    expect(m0037).toMatch(/create policy tenant_modules_platform_admin_insert_owner/i);
    expect(m0037).toMatch(/drop policy if exists invitations_platform_admin_insert_owner/i);
    expect(m0037).toMatch(/create policy invitations_platform_admin_insert_owner/i);
    expect(m0037).toMatch(/current_user is distinct from 'authenticated'/i);
    expect(m0037).toMatch(/current_user is distinct from 'endwise_app'/i);
    expect(m0037).toMatch(/app\.platform_admin/);
    expect(m0037).toMatch(/app\.tenant_id/);
    expect(m0037).not.toMatch(/disable row level security/i);
    expect(m0037).not.toMatch(/delete from audit_log/i);
  });

  it('db:grants feiler hvis eier-INSERT-policyene mangler', () => {
    expect(grantsTs).toMatch(/audit_log_tenant_insert_owner/);
    expect(grantsTs).toMatch(/tenants_platform_admin_insert_owner/);
    expect(grantsTs).toMatch(/tenant_modules_platform_admin_insert_owner/);
    expect(grantsTs).toMatch(/invitations_platform_admin_insert_owner/);
    expect(grantsTs).toMatch(/invitations_platform_admin_select_owner/);
    expect(grantsTs).toMatch(/invitations_owner_revoke_update/);
    expect(grantsTs).toMatch(/tenants_tenant_select_owner/);
    expect(grantsTs).toMatch(/dealer_profiles_tenant_select_owner/);
    expect(grantsTs).not.toMatch(/invitations_platform_admin_update_owner/);
    expect(grantsTs).toMatch(/process\.exit\(1\)/);
  });

  it('force-rls-testen krever at eier-INSERT-policyene finnes i runtime', () => {
    expect(forceRls).toMatch(/audit_log_tenant_insert_owner/);
    expect(forceRls).toMatch(/tenants_platform_admin_insert_owner/);
    expect(forceRls).toMatch(/tenant_modules_platform_admin_insert_owner/);
    expect(forceRls).toMatch(/invitations_platform_admin_insert_owner/);
    expect(forceRls).toMatch(/invitations_platform_admin_select_owner/);
    expect(forceRls).toMatch(/tenants_tenant_select_owner/);
    expect(forceRls).not.toMatch(/invitations_platform_admin_update_owner/);
  });
});
