import type { ModelRole } from '@endwise/modules';

/**
 * Modellkatalog med roller (techstack §2 AI-lag).
 *
 * **INGEN HARDKODEDE MODELLER.** Kallstedene ber om en ROLLE («fast», «hard» …),
 * og katalogen mapper (leverandør, plan, rolle) → modell-ID.
 *
 * Modell-ID-ene leses fra MILJØET, per leverandør:
 *   FIREWORKS_MODEL_FAST, MISTRAL_MODEL_FAST, …
 *
 * Grunnen til at de ikke ligger i kode: modellnavn endrer seg raskere enn
 * repoet, og en modell vi gjetter på er en modell som ikke finnes.
 */
export type PlanKey = 'starter' | 'pro' | 'enterprise';

export type RoleMap = Record<ModelRole, string>;

export interface ModelCatalog {
  /** Leverandøren katalogen gjelder for — brukes i feilmeldinger. */
  vendor: string;
  default: RoleMap;
  plans: Partial<Record<PlanKey, Partial<RoleMap>>>;
  /** Tenant-overstyringer (fra DB, ikke fra kode). */
  tenants?: Record<string, Partial<RoleMap>>;
}

export class ModelNotConfiguredError extends Error {
  readonly code = 'MODEL_NOT_CONFIGURED';
  constructor(role: ModelRole, envVar: string) {
    super(`Ingen modell konfigurert for rollen «${role}». Sett ${envVar}.`);
  }
}

const ROLES: ModelRole[] = ['fast', 'standard', 'hard', 'embed', 'realtime'];

function envVarFor(vendor: string, role: ModelRole): string {
  return `${vendor}_MODEL_${role.toUpperCase()}`;
}

/**
 * Bygger katalogen fra miljøet for én leverandør.
 * `vendor` er prefikset: 'FIREWORKS' → FIREWORKS_MODEL_FAST, 'MISTRAL' → MISTRAL_MODEL_FAST.
 */
export function catalogFromEnv(vendor: string, env: NodeJS.ProcessEnv = process.env): ModelCatalog {
  const map = {} as RoleMap;
  for (const role of ROLES) {
    map[role] = env[envVarFor(vendor, role)] ?? '';
  }
  return { vendor, default: map, plans: {} };
}

export function resolveModel(
  catalog: ModelCatalog,
  role: ModelRole,
  opts: { plan?: PlanKey; tenantId?: string } = {},
): string {
  const tenantOverride = opts.tenantId ? catalog.tenants?.[opts.tenantId]?.[role] : undefined;
  const planOverride = opts.plan ? catalog.plans[opts.plan]?.[role] : undefined;
  const model = tenantOverride ?? planOverride ?? catalog.default[role];

  if (!model) throw new ModelNotConfiguredError(role, envVarFor(catalog.vendor, role));
  return model;
}
