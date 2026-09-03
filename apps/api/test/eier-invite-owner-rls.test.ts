import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Prod (endwise.no) etter 0037: tenants.create kommer forbi insert into
 * tenants (eier-INSERT-policy + platform_admin i createTenantShell), men
 * 500-er på insert into invitations.
 *
 * Rotårsak: opprettEier bruker withTenant(ny dealer-id) men setter ikke
 * app.platform_admin i samme transaksjon. Prod APP er rolle `endwise`
 * under FORCE RLS. invitations_platform_admin_insert_owner krever
 * tenant_id = app.tenant_id ELLER platform_admin=on. Uten begge i samme
 * tx som INSERT (samme mønster som createTenant) feiler WITH CHECK når
 * sesjons-GUC fortsatt er Endwise eller tom.
 *
 * I tillegg: createTenantShell committer organization (+ tenants) FØR
 * sendEierLenke kaster. Slug blir liggende; neste forsøk gir
 * «slug already in use» med tom forhandlerliste.
 */

const her = dirname(fileURLToPath(import.meta.url));
const opprettEier = readFileSync(
  resolve(her, '../../../packages/modules/src/invitasjoner/index.ts'),
  'utf8',
);
const createTenant = readFileSync(resolve(her, '../../../packages/auth/src/tenant.ts'), 'utf8');
const tenantsRouter = readFileSync(resolve(her, '../src/trpc/routers/tenants.ts'), 'utf8');

function funksjonKropp(kilde: string, navn: string): string {
  const start = kilde.search(new RegExp(`async ${navn}\\s*\\(`));
  expect(start, `mangler async ${navn}`).toBeGreaterThan(-1);
  return kilde.slice(start, start + 2800);
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
});
