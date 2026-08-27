import { type Database, eq, schema, withTenant } from '@endwise/db';
import { erPlattformTenant } from '../plattform/index.ts';

/**
 * Skriv Quick `client/info` på DENNE tenantens forhandler.
 * Firmanavn → tenants.name / organization.name.
 * Øvrige butikkfelt → dealer_profiles. slug skrives aldri.
 * Tom Quick-verdi overskriver ikke. Plattform-org røres aldri.
 */

export type DealerProfilePatch = {
  name: string | null;
  orgnr: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  leftover: Record<string, unknown>;
  mappedKeys: readonly string[];
};

export type DealerProfileColumns = {
  orgnr?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
};

export type DealerProfileWrite = {
  tenants: { name?: string };
  organization: { name?: string };
  profile: DealerProfileColumns;
  leftover: Record<string, unknown>;
  skipReason?: 'platform' | 'empty';
};

function nonempty(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

/** Tom leftover tømmer ikke eksisterende quick_client. */
export function leftoverBagWrite(
  leftover: Record<string, unknown>,
): Record<string, unknown> | null {
  return Object.keys(leftover).length > 0 ? leftover : null;
}

export function buildDealerProfileWrite(
  tenant: { slug: string; kind: string },
  patch: DealerProfilePatch,
): DealerProfileWrite {
  if (erPlattformTenant(tenant)) {
    return { tenants: {}, organization: {}, profile: {}, leftover: {}, skipReason: 'platform' };
  }

  const name = nonempty(patch.name);
  const profile: DealerProfileColumns = {};
  const orgnr = nonempty(patch.orgnr);
  const address = nonempty(patch.address);
  const postalCode = nonempty(patch.postalCode);
  const city = nonempty(patch.city);
  const phone = nonempty(patch.phone);
  const email = nonempty(patch.email);
  const website = nonempty(patch.website);
  if (orgnr) profile.orgnr = orgnr;
  if (address) profile.address = address;
  if (postalCode) profile.postalCode = postalCode;
  if (city) profile.city = city;
  if (phone) profile.phone = phone;
  if (email) profile.email = email;
  if (website) profile.website = website;

  const leftover = patch.leftover ?? {};
  const hasName = Boolean(name);
  const hasProfile = Object.keys(profile).length > 0;
  const hasLeftover = Object.keys(leftover).length > 0;
  if (!hasName && !hasProfile && !hasLeftover) {
    return { tenants: {}, organization: {}, profile: {}, leftover: {}, skipReason: 'empty' };
  }

  return {
    tenants: name ? { name } : {},
    organization: name ? { name } : {},
    profile,
    leftover,
  };
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
    if (write.skipReason) {
      return { applied: false, mappedKeys: [], skipReason: write.skipReason };
    }

    if (write.tenants.name) {
      await tx
        .update(schema.tenants)
        .set({ name: write.tenants.name, updatedAt: new Date() })
        .where(eq(schema.tenants.id, tenantId));
      await tx
        .update(schema.organization)
        .set({ name: write.organization.name })
        .where(eq(schema.organization.id, tenantId));
    }

    const hasProfile = Object.keys(write.profile).length > 0;
    const leftoverBag = leftoverBagWrite(write.leftover);
    if (hasProfile || leftoverBag) {
      const now = new Date();
      await tx
        .insert(schema.dealerProfiles)
        .values({
          tenantId,
          ...write.profile,
          ...(leftoverBag ? { quickClient: leftoverBag } : {}),
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: schema.dealerProfiles.tenantId,
          set: {
            ...write.profile,
            ...(leftoverBag ? { quickClient: leftoverBag } : {}),
            updatedAt: now,
          },
        });
    }

    return { applied: true, mappedKeys: patch.mappedKeys };
  });
}
