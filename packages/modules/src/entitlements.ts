/**
 * F0-04 — Entitlements-oppslag (DB-styrt).
 *
 * Entitlement != feature flag:
 *   - entitlement    -> «har denne forhandleren kjøpt modulen?»  (tenant_modules i DB)
 *   - release-toggle -> «har VI rullet ut funksjonen?»           (Vercel Flags SDK)
 * Begge må si ja. Blandes de, får du enten lekkasje eller feilfakturering.
 */
export type ModuleKey = string;

export interface EntitlementsSource {
  listModules(tenantId: string): Promise<ModuleKey[]>;
}

export interface Entitlements {
  has(tenantId: string, moduleKey: ModuleKey): Promise<boolean>;
  assert(tenantId: string, moduleKey: ModuleKey): Promise<void>;
}

export class EntitlementError extends Error {
  readonly code = 'ENTITLEMENT_REQUIRED';
  // Eksplisitt felt (ikke TS parameter property) — strip-only-trygt, se scope-gate.ts.
  readonly moduleKey: ModuleKey;
  constructor(moduleKey: ModuleKey) {
    super(`Tenant mangler entitlement for modul "${moduleKey}"`);
    this.moduleKey = moduleKey;
  }
}

export function createEntitlements(source: EntitlementsSource): Entitlements {
  return {
    async has(tenantId, moduleKey) {
      const modules = await source.listModules(tenantId);
      return modules.includes(moduleKey);
    },
    async assert(tenantId, moduleKey) {
      const modules = await source.listModules(tenantId);
      if (!modules.includes(moduleKey)) throw new EntitlementError(moduleKey);
    },
  };
}
