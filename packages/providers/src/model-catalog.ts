import type { ModelRole } from '@endwise/modules/contracts';

/**
 * Modellkatalog med roller (techstack §2 AI-lag).
 * INGEN hardkodede modeller i kallstedene — de ber om en ROLLE.
 * Katalogen mapper (plan, rolle) -> modell-ID og kan overstyres per tenant.
 */
export type PlanKey = 'starter' | 'pro' | 'enterprise';

export type RoleMap = Record<ModelRole, string>;

export interface ModelCatalog {
  /** Fallback når planen ikke har egen mapping. */
  default: RoleMap;
  plans: Partial<Record<PlanKey, Partial<RoleMap>>>;
  /** Tenant-overstyringer (settes fra DB, ikke fra kode). */
  tenants?: Record<string, Partial<RoleMap>>;
}

export function resolveModel(
  catalog: ModelCatalog,
  role: ModelRole,
  opts: { plan?: PlanKey; tenantId?: string } = {},
): string {
  const tenantOverride = opts.tenantId ? catalog.tenants?.[opts.tenantId]?.[role] : undefined;
  const planOverride = opts.plan ? catalog.plans[opts.plan]?.[role] : undefined;
  return tenantOverride ?? planOverride ?? catalog.default[role];
}
