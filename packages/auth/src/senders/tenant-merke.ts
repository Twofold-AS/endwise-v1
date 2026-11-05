import { type Database, eq, schema, withTenant } from '@endwise/db';
import type { AuthSone } from '../sone.ts';
import type { EpostMerke } from './merke.ts';

/** Branding følger verten: <sub> = forhandler, app/platform = Endwise. */
export function epostMerkeFraSone(sone: AuthSone | null | undefined): 'forhandler' | 'endwise' {
  return sone === 'forhandler' ? 'forhandler' : 'endwise';
}

export async function hentEpostMerke(db: Database, tenantId: string): Promise<EpostMerke | null> {
  const rad = await withTenant(db, tenantId, async (tx) => {
    const [tenant] = await tx
      .select({ name: schema.tenants.name })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId))
      .limit(1);
    const [branding] = await tx
      .select({
        visningsnavn: schema.tenantBranding.visningsnavn,
        logoUrl: schema.tenantBranding.logoUrl,
      })
      .from(schema.tenantBranding)
      .where(eq(schema.tenantBranding.tenantId, tenantId))
      .limit(1);
    return { tenant, branding };
  });
  const navn = (rad.branding?.visningsnavn || rad.tenant?.name || '').trim();
  if (navn.length < 2) return null;
  return {
    navn,
    levertAv: true,
    logoUrl: rad.branding?.logoUrl ?? null,
  };
}
