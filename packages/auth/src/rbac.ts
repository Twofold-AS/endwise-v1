import { createAccessControl } from 'better-auth/plugins/access';

/**
 * F1-05 — RBAC.
 * Fem roller. `customer` er sluttkunden (widget/Min side) og har
 * bevisst ingen rettigheter i forhandlerens data — kun sine egne bookinger, som
 * uansett er RLS-skjermet. `endwise_support` er plattform-team, ikke
 * forhandlerens jobbfunksjon «support».
 */
export const statement = {
  booking: ['create', 'read', 'update', 'cancel'],
  mechanic: ['read', 'assign', 'manage'],
  customer: ['read', 'manage'],
  service: ['read', 'manage'],
  tenant: ['read', 'manage'],
  entitlement: ['read', 'manage'],
  member: ['read', 'invite', 'manage'],
  audit: ['read'],
  /**
   * F2-09 — Lager. KJERNE (ingen modul-gate), men ikke fritt fram for alle
   * roller: «alle forhandlere» er modul-nivå, ikke rolle-nivå.
   *
   *   read   — se deler og beholdning
   *   move   — ta ut / registrere inn / reservere (dagens arbeid)
   *   manage — korrigere beholdning, nedskrive, endre lokasjoner og kostpris
   *
   * Skillet som betyr noe: en ansatt skal kunne TA UT en del uten å kunne
   * JUSTERE beholdningen. Uttak er sporbart mot en jobb; en justering er et
   * tall noen bestemte, og den skal en admin stå bak.
   */
  inventory: ['read', 'move', 'manage'],
} as const;

export const ac = createAccessControl(statement);

/** Sluttkunde. Ingen tilgang til forhandlerens flater. */
export const customer = ac.newRole({
  booking: ['create', 'read', 'cancel'],
});

/** Ansatt hos forhandler: jobber i kalenderen, styrer ikke huset. */
export const dealerStaff = ac.newRole({
  booking: ['create', 'read', 'update', 'cancel'],
  mechanic: ['read', 'assign'],
  customer: ['read'],
  service: ['read'],
  // Tar ut deler til jobber, men korrigerer ikke beholdningen.
  inventory: ['read', 'move'],
});

/** Forhandler-admin: full kontroll i EGEN tenant. */
export const dealerAdmin = ac.newRole({
  booking: ['create', 'read', 'update', 'cancel'],
  mechanic: ['read', 'assign', 'manage'],
  customer: ['read', 'manage'],
  service: ['read', 'manage'],
  tenant: ['read', 'manage'],
  entitlement: ['read'],
  member: ['read', 'invite', 'manage'],
  audit: ['read'],
  inventory: ['read', 'move', 'manage'],
});

/** Endwise-admin (oss). Eneste rolle som kan endre entitlements. */
export const endwiseAdmin = ac.newRole({
  booking: ['create', 'read', 'update', 'cancel'],
  mechanic: ['read', 'assign', 'manage'],
  customer: ['read', 'manage'],
  service: ['read', 'manage'],
  tenant: ['read', 'manage'],
  entitlement: ['read', 'manage'],
  member: ['read', 'invite', 'manage'],
  audit: ['read'],
  inventory: ['read', 'move', 'manage'],
});

/**
 * Plattform-support. Innboks + Se verkstedet (lesing). Ikke flagg, ikke
 * slett forhandler, ikke team. ⛔ Ikke dealer_staff «support».
 */
export const endwiseSupport = ac.newRole({
  booking: ['read'],
  mechanic: ['read'],
  customer: ['read'],
  service: ['read'],
  tenant: ['read'],
  entitlement: ['read'],
  member: ['read'],
  audit: ['read'],
  inventory: ['read'],
});

export const roles = {
  customer,
  dealer_staff: dealerStaff,
  dealer_admin: dealerAdmin,
  endwise_admin: endwiseAdmin,
  endwise_support: endwiseSupport,
} as const;

export type Role = keyof typeof roles;

/** Roller som ALLTID krever 2FA (F1-11 — ingen bypass). */
export const ROLES_REQUIRING_2FA: readonly Role[] = [
  'dealer_admin',
  'dealer_staff',
  'endwise_admin',
  'endwise_support',
];
