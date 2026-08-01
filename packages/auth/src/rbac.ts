import { createAccessControl } from 'better-auth/plugins/access';

/**
 * F1-05 — RBAC.
 * Fire roller (roadmap F1-05). `customer` er sluttkunden (widget/Min side) og har
 * bevisst ingen rettigheter i forhandlerens data — kun sine egne bookinger, som
 * uansett er RLS-skjermet.
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
});

export const roles = {
  customer,
  dealer_staff: dealerStaff,
  dealer_admin: dealerAdmin,
  endwise_admin: endwiseAdmin,
} as const;

export type Role = keyof typeof roles;

/** Roller som ALLTID krever 2FA (F1-11 — ingen bypass). */
export const ROLES_REQUIRING_2FA: readonly Role[] = [
  'dealer_admin',
  'dealer_staff',
  'endwise_admin',
];
