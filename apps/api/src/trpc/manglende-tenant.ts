import { TRPCError } from '@trpc/server';

/**
 * organization-rad uten speilet tenants-rad er en datahendelse, ikke
 * ferdig onboarding. Typisk: Better-Auth-org leftover etter
 * `slett_forhandler`, eller `createTenant` som skrev organization og
 * ikke tenants. Reparer org ↔ tenants i databasen. Ikke late som
 * veiviseren lyktes, og ikke kjør SQL mot prod herfra.
 */
export const MANGLER_TENANT_MELDING = 'Forhandler-raden mangler i databasen';

export function loggManglendeTenantRad(hvor: string, tenantId: string) {
  console.error('[tenant] tenants-rad mangler', { hvor, tenantId });
}

export function manglendeTenantFeil() {
  return new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: MANGLER_TENANT_MELDING,
  });
}
