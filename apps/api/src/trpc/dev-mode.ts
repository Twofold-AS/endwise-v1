import { eq, schema, withTenant } from '@endwise/db';
import type { AppContext } from '../context.ts';

/**
 * F5-27 / F5-28 ① — dev-mode-gaten. **Ett sted. Ikke fire.**
 * Dev-mode lar en Endwise-utvikler gå gjennom hele produktet med demo-data.
 * Det er per definisjon en snarvei rundt den vanlige veien inn, og en snarvei
 * er akkurat så trygg som den strengeste betingelsen den krever.
 * Tre uavhengige betingelser, alle må holde
 * (a) flagget `dev-mode` er på (globalt eller for tenanten)
 * (b) `ctx.role 'endwise_admin'`
 * (c) tenanten har `kind = 'demo'`
 * Hvorfor tre, når én ville stoppet de fleste? Fordi de feiler ulikt:
 * Flagget alene er svakt — `flags.setOverride` er `adminProcedure`, som
 * også slipper inn `dealer_admin`. (Det hullet er i tillegg lukket med en
 * allowlist i `flags.ts`. Belte og bukseseler.)
 * Rollen alene er ikke nok — en Endwise-admin skal kunne jobbe i en ekte
 * tenant uten at demo-maskineriet slår inn.
 * `kind = 'demo'` alene er ikke nok — en demo-tenant skal ikke gi
 * dev-rettigheter til hvem som helst som er medlem av den.
 * Én glipp er derfor ikke nok til å åpne noe.
 * Fail-safe: enhver feil på veien (DB nede, tenant borte, flagg mangler)
 * gir `false`. Dev-mode av er alltid det trygge svaret.
 */
export const DEV_MODE_FLAG = 'dev-mode';

export type DevModeStatus = {
  /** Alle tre betingelsene holder. Dette er den eneste som skal styre oppførsel. */
  enabled: boolean;
  /** Hvorfor ikke — for admin-UI-et, så bryteren kan forklare seg selv. */
  flagOn: boolean;
  isEndwiseAdmin: boolean;
  isDemoTenant: boolean;
};

const AV: DevModeStatus = {
  enabled: false,
  flagOn: false,
  isEndwiseAdmin: false,
  isDemoTenant: false,
};

export async function resolveDevMode(ctx: AppContext): Promise<DevModeStatus> {
  if (!ctx.tenantId || !ctx.role) return AV;

  try {
    return await withTenant(ctx.db, ctx.tenantId, async (tx) => {
      const [global] = await tx
        .select({ enabled: schema.featureFlags.enabled })
        .from(schema.featureFlags)
        .where(eq(schema.featureFlags.key, DEV_MODE_FLAG));

      const [override] = await tx
        .select({ enabled: schema.featureFlagOverrides.enabled })
        .from(schema.featureFlagOverrides)
        .where(eq(schema.featureFlagOverrides.flagKey, DEV_MODE_FLAG));

      const [tenant] = await tx
        .select({ kind: schema.tenants.kind })
        .from(schema.tenants)
        .where(eq(schema.tenants.id, ctx.tenantId as string));

      const flagOn = override?.enabled ?? global?.enabled ?? false;
      const isEndwiseAdmin = ctx.role === 'endwise_admin';
      const isDemoTenant = tenant?.kind === 'demo';

      return {
        enabled: flagOn && isEndwiseAdmin && isDemoTenant,
        flagOn,
        isEndwiseAdmin,
        isDemoTenant,
      };
    });
  } catch {
    return AV;
  }
}
