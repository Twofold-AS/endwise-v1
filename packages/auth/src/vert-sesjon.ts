/**
 * F40 — sesjon på kundevert er bundet til host-forhandleren.
 * Cookie er __Host- (ingen Domain). Token kopiert til annen vert = avvis.
 */
export function vertSesjonTillatt(input: {
  authSone: 'forhandler' | 'platform' | 'app' | null;
  hostTenantId: string | null;
  sesjonOrg: string | null;
}): boolean {
  if (input.authSone !== 'forhandler') return true;
  if (!input.hostTenantId) return false;
  if (input.sesjonOrg && input.sesjonOrg !== input.hostTenantId) return false;
  return true;
}

/** Kundedata: tenant fra host og sesjon må være samme forhandler. */
export function kundeTenantFraHost(input: {
  hostTenantId: string | null;
  tenantId: string | null;
}): boolean {
  return Boolean(input.hostTenantId && input.tenantId && input.hostTenantId === input.tenantId);
}
