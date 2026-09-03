import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Prod (endwise.no) etter squash #120 (04dbab2): tenants.create kommer
 * forbi insert into tenants, men 500-er på insert into invitations.
 *
 * #120 satte app.platform_admin i opprettEier og skrev
 * organization+tenants+invite i samme withTenant. Det tetter WITH CHECK
 * på invitations_platform_admin_insert_owner. Det er ikke nok:
 * opprettEier bruker INSERT … RETURNING. Under FORCE RLS som eier
 * `endwise` finnes ingen SELECT-policy som matcher (tenant_isolation er
 * TO authenticated; open_by_hash krever invitation_hash-GUC;
 * slett_select krever slett-GUC). Postgres avviser RETURNING med
 * «new row violates row-level security policy» — Drizzle viser bare
 * «Failed query: insert into invitations» + params.
 *
 * withTenant(ny UUID) krever ingen preexisting tenants-rad — den setter
 * bare set_config. createTenantShell-rekkefølge: org → tenants →
 * modules → inTx. opprettEier(eksisterendeTx) nøster ikke withTenant.
 */

const her = dirname(fileURLToPath(import.meta.url));
const opprettEier = readFileSync(
  resolve(her, '../../../packages/modules/src/invitasjoner/index.ts'),
  'utf8',
);
const createTenant = readFileSync(resolve(her, '../../../packages/auth/src/tenant.ts'), 'utf8');
const tenantsRouter = readFileSync(resolve(her, '../src/trpc/routers/tenants.ts'), 'utf8');
const grants = readFileSync(resolve(her, '../../../packages/db/sql/grants.sql'), 'utf8');
const grantsTs = readFileSync(resolve(her, '../../../packages/db/scripts/grants.ts'), 'utf8');
const journal = readFileSync(
  resolve(her, '../../../packages/db/drizzle/meta/_journal.json'),
  'utf8',
);

function funksjonKropp(kilde: string, navn: string): string {
  const start = kilde.search(new RegExp(`async ${navn}\\s*\\(`));
  expect(start, `mangler async ${navn}`).toBeGreaterThan(-1);
  return kilde.slice(start, start + 2800);
}

function policyKropp(sql: string, navn: string): string {
  const start = sql.indexOf(`create policy ${navn}`);
  expect(start, `mangler create policy ${navn}`).toBeGreaterThan(-1);
  const etter = sql.slice(start);
  const slutt = etter.search(/\n(?:drop policy|create policy) /);
  return slutt === -1 ? etter : etter.slice(0, slutt);
}

describe('FORCE RLS eier-invite på tenants.create', () => {
  it('opprettEier setter platform_admin i samme withTenant som invitations-INSERT', () => {
    const kropp = funksjonKropp(opprettEier, 'opprettEier');
    expect(kropp).toMatch(/withTenant\(db, input\.tenantId/);
    expect(kropp).toMatch(/app\.platform_admin/);
    expect(kropp).toMatch(/insert\(schema\.invitations\)/);
    const insertAt = kropp.search(/insert\(schema\.invitations\)/);
    const gucAt = kropp.search(/app\.platform_admin/);
    expect(gucAt).toBeGreaterThan(-1);
    expect(gucAt).toBeLessThan(insertAt);
    expect(kropp).toMatch(/return withTenant\(db, input\.tenantId/);
  });

  it('createTenantShell skriver organization inne i withTenant (ny id + platform_admin)', () => {
    const start = createTenant.search(/export async function createTenantShell/);
    expect(start).toBeGreaterThan(-1);
    const kropp = createTenant.slice(start, start + 2200);
    expect(kropp).toMatch(/withTenant\(db, tenantId/);
    expect(kropp).toMatch(/app\.platform_admin/);
    expect(kropp).toMatch(/insert\(schema\.organization\)/);
    expect(kropp).toMatch(/insert\(schema\.tenants\)/);
    const withAt = kropp.search(/withTenant\(db, tenantId/);
    const orgAt = kropp.search(/insert\(schema\.organization\)/);
    expect(orgAt).toBeGreaterThan(withAt);
  });

  it('tenants.create kjører eier-invite i createTenantShell-tx eller rydder skallet ved feil', () => {
    const start = tenantsRouter.search(/create: endwiseAdminProcedure/);
    expect(start).toBeGreaterThan(-1);
    const kropp = tenantsRouter.slice(start, start + 5500);
    expect(kropp).toMatch(/createTenantShell/);
    expect(kropp).toMatch(/opprettEier/);
    expect(kropp).toMatch(/slettUferdigForhandler|inTx|etterOpprett/);
    expect(kropp).not.toMatch(/skip.*invite|uten invite|uten invitasjon/i);
  });

  it('slettUferdigForhandler fjerner organization-slug (ikke bare tenants-raden)', () => {
    expect(createTenant).toMatch(/export async function slettUferdigForhandler/);
    const start = createTenant.search(/export async function slettUferdigForhandler/);
    const kropp = createTenant.slice(start, start + 1600);
    expect(kropp).toMatch(/schema\.organization/);
    expect(kropp).toMatch(/schema\.tenants/);
    expect(kropp).not.toMatch(/disable row level security/i);
    expect(kropp).not.toMatch(/no force row level security/i);
  });

  it('createTenantShell: withTenant(ny UUID) før tenants-rad, deretter org → tenants → inTx', () => {
    const start = createTenant.search(/export async function createTenantShell/);
    const kropp = createTenant.slice(start, start + 2200);
    const withAt = kropp.search(/withTenant\(db, tenantId/);
    const orgAt = kropp.search(/insert\(schema\.organization\)/);
    const tenantAt = kropp.search(/insert\(schema\.tenants\)/);
    const inTxAt = kropp.search(/if \(inTx\) await inTx/);
    expect(withAt).toBeGreaterThan(-1);
    expect(orgAt).toBeGreaterThan(withAt);
    expect(tenantAt).toBeGreaterThan(orgAt);
    expect(inTxAt).toBeGreaterThan(tenantAt);
    expect(kropp.slice(0, orgAt)).not.toMatch(/from\(schema\.tenants\)/);
  });

  it('opprettEier bruker eksisterende tx uten å nøste withTenant', () => {
    const kropp = funksjonKropp(opprettEier, 'opprettEier');
    expect(kropp).toMatch(/eksisterendeTx/);
    expect(kropp).toMatch(/if \(eksisterendeTx\) return skriv\(eksisterendeTx\)/);
    expect(kropp).toMatch(/\.returning\(\)/);
  });

  it('eier-SELECT på invitations finnes (INSERT … RETURNING under FORCE RLS)', () => {
    const kropp = policyKropp(grants, 'invitations_platform_admin_select_owner');
    expect(kropp).toMatch(/for select/);
    expect(kropp).toMatch(/to public/);
    expect(kropp).toMatch(/current_user is distinct from 'authenticated'/);
    expect(kropp).toMatch(/current_user is distinct from 'endwise_app'/);
    expect(kropp).toMatch(/app\.tenant_id/);
    expect(kropp).not.toMatch(/for insert/);
    expect(kropp).not.toMatch(/for all/);
    expect(kropp).not.toMatch(/disable row level security/i);
    expect(kropp).not.toMatch(/app\.invitation_hash/);
    expect(kropp).not.toMatch(/app\.slett_tenant_id/);
    // Ikke blanket lesing av alle invitasjoner via platform_admin alene.
    expect(kropp).not.toMatch(/or current_setting\('app\.platform_admin'/);
  });

  it('eier-UPDATE på invitations er tenant-skopet (tilbakekall/resend)', () => {
    const kropp = policyKropp(grants, 'invitations_platform_admin_update_owner');
    expect(kropp).toMatch(/for update/);
    expect(kropp).toMatch(/to public/);
    expect(kropp).toMatch(/app\.tenant_id/);
    expect(kropp).toMatch(/current_user is distinct from 'authenticated'/);
    expect(kropp).toMatch(/current_user is distinct from 'endwise_app'/);
    expect(kropp).not.toMatch(/for all/);
    expect(kropp).not.toMatch(/or current_setting\('app\.platform_admin'/);
  });

  it('0038 + db:grants krever eier-SELECT (RETURNING), skrur ikke av FORCE RLS', () => {
    expect(journal).toMatch(/0038_invitations_owner_returning/);
    expect(grantsTs).toMatch(/invitations_platform_admin_select_owner/);
    expect(grantsTs).toMatch(/invitations_platform_admin_update_owner/);
    expect(grants).not.toMatch(/no force row level security/i);
    expect(grants).toMatch(/force row level security/);
  });

  it('tenants.create logger SQLSTATE internt og lekker ikke Failed query til UI', () => {
    const start = tenantsRouter.search(/create: endwiseAdminProcedure/);
    const kropp = tenantsRouter.slice(start, start + 6500);
    expect(kropp).toMatch(/loggCreatePostgresFeil|lesPostgresCause/);
    expect(kropp).toMatch(/mapCreatePostgresFeil/);
    expect(kropp).not.toMatch(/throw error;/);
  });
});
