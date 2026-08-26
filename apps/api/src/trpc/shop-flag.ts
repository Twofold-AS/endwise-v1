import { and, eq, schema, withTenant } from '@endwise/db';
import type { AppContext } from '../context.ts';

/**
 * Butikk-flagget. **Ikke en modul.** Shop kan ikke entitles via
 * admin (`IKKE_TILDELBARE_ADDON`). Synlighet styres av `feature_flags.shop`
 * + tenant-overstyring, samme mønster som andre flagg på `/endwise/flagg`.
 * Fail-safe: feiler oppslaget, er svaret av. En tom/feilet lesning
 * skal aldri åpne Butikk for en forhandler som ikke er merket.
 */
export const SHOP_FLAG = 'shop';

const AV = false;

export async function resolveShopFlag(ctx: Pick<AppContext, 'db' | 'tenantId'>): Promise<boolean> {
  if (!ctx.tenantId) return AV;

  try {
    return await withTenant(ctx.db, ctx.tenantId, async (tx) => {
      const [global] = await tx
        .select({ enabled: schema.featureFlags.enabled })
        .from(schema.featureFlags)
        .where(eq(schema.featureFlags.key, SHOP_FLAG));

      const [override] = await tx
        .select({ enabled: schema.featureFlagOverrides.enabled })
        .from(schema.featureFlagOverrides)
        .where(
          and(
            eq(schema.featureFlagOverrides.flagKey, SHOP_FLAG),
            eq(schema.featureFlagOverrides.tenantId, ctx.tenantId as string),
          ),
        );

      return override?.enabled ?? global?.enabled ?? AV;
    });
  } catch {
    return AV;
  }
}
