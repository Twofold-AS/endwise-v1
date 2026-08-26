import { type Database, eq, schema, withTenant } from '@endwise/db';
import { erPlattformTenant } from '../plattform/index.ts';

/**
 * F8-01 — Skriv Quick `client/info` på DENNE tenantens forhandler.
 *
 * Kolonner som finnes: tenants.name / organization.name, tenants.slug /
 * organization.slug. slug skrives ALDRI (unik + `/endwise/verksted/[slug]`).
 * Ingen adresse/orgnr/nettside/telefon/e-post på organizations/tenants.
 * Plattform-org (`endwise` / kind=platform) røres aldri.
 */

export type DealerProfilePatch = {
  name: string | null;
  mappedKeys: readonly string[];
};

export type DealerProfileWrite = {
  tenants: { name?: string };
  organization: { name?: string };
  skipReason?: 'platform' | 'empty';
};

export function buildDealerProfileWrite(
  tenant: { slug: string; kind: string },
  patch: DealerProfilePatch,
): DealerProfileWrite {
  if (erPlattformTenant(tenant)) {
    return { tenants: {}, organization: {}, skipReason: 'platform' };
  }
  const name = patch.name?.trim() || null;
  if (!name) return { tenants: {}, organization: {}, skipReason: 'empty' };
  return { tenants: { name }, organization: { name } };
}

export async function applyQuickDealerProfile(
  db: Database,
  tenantId: string,
  patch: DealerProfilePatch,
): Promise<{ applied: boolean; mappedKeys: readonly string[]; skipReason?: string }> {
  return withTenant(db, tenantId, async (tx) => {
    const [tenant] = await tx
      .select({
        slug: schema.tenants.slug,
        kind: schema.tenants.kind,
      })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId));

    if (!tenant) {
      return { applied: false, mappedKeys: [], skipReason: 'missing' };
    }

    const write = buildDealerProfileWrite(tenant, patch);
    if (write.skipReason || !write.tenants.name) {
      return { applied: false, mappedKeys: [], skipReason: write.skipReason };
    }

    await tx
      .update(schema.tenants)
      .set({ name: write.tenants.name, updatedAt: new Date() })
      .where(eq(schema.tenants.id, tenantId));
    await tx
      .update(schema.organization)
      .set({ name: write.organization.name })
      .where(eq(schema.organization.id, tenantId));

    return { applied: true, mappedKeys: patch.mappedKeys };
  });
}
