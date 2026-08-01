import { type Database, findMembership, schema } from '@endwise/db';
import type { Auth } from './auth.ts';
import type { Role } from './rbac.ts';

/**
 * F1-04 — Tenant-opprettelse og isolasjon.
 *
 * ADR-002: `organization.id` ER `tenant_id`. `tenants`-tabellen speiler
 * organisasjonen og eier de domene-nære feltene (config, entitlements henger på).
 * Én skriving, to tabeller — derfor transaksjon.
 */
export interface CreateTenantInput {
  name: string;
  slug: string;
  /** Brukeren som blir dealer_admin i den nye tenanten. */
  ownerUserId: string;
  /** Moduler tenanten starter med (entitlements, F0-04). */
  modules?: string[];
  plan?: string;
}

export async function createTenant(
  auth: Auth,
  db: Database,
  input: CreateTenantInput,
): Promise<{ tenantId: string }> {
  const org = await auth.api.createOrganization({
    body: {
      name: input.name,
      slug: input.slug,
      userId: input.ownerUserId,
    },
  });

  if (!org) throw new Error('Kunne ikke opprette organisasjon');
  const tenantId = org.id;

  await db.transaction(async (tx) => {
    await tx.insert(schema.tenants).values({
      id: tenantId,
      name: input.name,
      slug: input.slug,
    });

    if (input.modules?.length) {
      await tx.insert(schema.tenantModules).values(
        input.modules.map((moduleKey) => ({
          tenantId,
          moduleKey,
          plan: input.plan ?? null,
        })),
      );
    }
  });

  return { tenantId };
}

export class TenantAccessError extends Error {
  readonly code = 'TENANT_FORBIDDEN';
  constructor(userId: string, tenantId: string) {
    super(`Bruker ${userId} er ikke medlem av tenant ${tenantId}`);
  }
}

/**
 * F1-04 — Den andre halvdelen av tenant-isolasjonen.
 *
 * RLS beskytter domenetabellene, men RLS kan ikke vite om brukeren HAR lov til
 * å be om denne tenanten — den stoler på `app.tenant_id`. Derfor: verifiser
 * medlemskap FØR `withTenant()` settes. Uten denne sjekken kan en innlogget
 * bruker be om en annen tenants ID og RLS vil lydig slippe det gjennom.
 */
export async function assertMember(db: Database, userId: string, tenantId: string): Promise<Role> {
  const membership = await findMembership(db, userId, tenantId);
  if (!membership) throw new TenantAccessError(userId, tenantId);
  return membership.role as Role;
}
