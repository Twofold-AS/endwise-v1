import { createAccessControl } from 'better-auth/plugins/access';

/**
 * RBAC.
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
   * Lager. Kjerne (ingen modul-gate), men ikke fritt fram for alle
   * roller: «alle forhandlere» er modul-nivå, ikke rolle-nivå.
   * read — se deler og beholdning
   * move — ta ut / registrere inn / reservere (dagens arbeid)
   * manage — korrigere beholdning, nedskrive, endre lokasjoner og kostpris
   * Skillet som betyr noe: en ansatt skal kunne ta ut en del uten å kunne
   * Justere beholdningen. Uttak er sporbart mot en jobb; en justering er et
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

/** Forhandler-admin: full kontroll i egen tenant. */
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
 * slett forhandler, ikke team. Ikke dealer_staff «support».
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

/** Roller som alltid krever 2FA (F1-11 — ingen bypass). */
export const ROLES_REQUIRING_2FA: readonly Role[] = [
  'customer',
  'dealer_admin',
  'dealer_staff',
  'endwise_admin',
  'endwise_support',
];

export type RbacRessurs = keyof typeof statement;

/**
 * Speil av `ac.newRole`-deklarasjonene over. Better-Auth sin Role-type
 * eksponerer ikke statements som vi kan lese uten å gjette API — denne
 * tabellen er det tRPC faktisk kaller. Hold den identisk med rollene over.
 */
const TILLATELSER: Record<Role, Partial<Record<RbacRessurs, readonly string[]>>> = {
  customer: { booking: ['create', 'read', 'cancel'] },
  dealer_staff: {
    booking: ['create', 'read', 'update', 'cancel'],
    mechanic: ['read', 'assign'],
    customer: ['read'],
    service: ['read'],
    inventory: ['read', 'move'],
  },
  dealer_admin: {
    booking: ['create', 'read', 'update', 'cancel'],
    mechanic: ['read', 'assign', 'manage'],
    customer: ['read', 'manage'],
    service: ['read', 'manage'],
    tenant: ['read', 'manage'],
    entitlement: ['read'],
    member: ['read', 'invite', 'manage'],
    audit: ['read'],
    inventory: ['read', 'move', 'manage'],
  },
  endwise_admin: {
    booking: ['create', 'read', 'update', 'cancel'],
    mechanic: ['read', 'assign', 'manage'],
    customer: ['read', 'manage'],
    service: ['read', 'manage'],
    tenant: ['read', 'manage'],
    entitlement: ['read', 'manage'],
    member: ['read', 'invite', 'manage'],
    audit: ['read'],
    inventory: ['read', 'move', 'manage'],
  },
  endwise_support: {
    booking: ['read'],
    mechanic: ['read'],
    customer: ['read'],
    service: ['read'],
    tenant: ['read'],
    entitlement: ['read'],
    member: ['read'],
    audit: ['read'],
    inventory: ['read'],
  },
};

/** Har rollen denne handlingen i RBAC-kartet? Jobbfunksjon er et eget lag. */
export function kan(
  role: Role | null | undefined,
  ressurs: RbacRessurs,
  handling: string,
): boolean {
  if (!role) return false;
  return TILLATELSER[role][ressurs]?.includes(handling) ?? false;
}

export function rolleKrever2FA(rolle: string | null | undefined): boolean {
  return (ROLES_REQUIRING_2FA as readonly string[]).includes(rolle ?? '');
}

/**
 * Mekaniker-sesjon: dealer_staff + (mechanics.userId eller job_function).
 * dealer_admin som også har mekaniker-rad er fortsatt forhandler.
 */
export function erMekanikerKonto(input: {
  role: Role | string | null | undefined;
  jobFunction?: string | null;
  isMechanic?: boolean;
}): boolean {
  if (input.role === 'dealer_admin' || input.role === 'endwise_admin') return false;
  if (input.role !== 'dealer_staff') return false;
  return Boolean(input.isMechanic) || input.jobFunction === 'mekaniker';
}

/** Selger, support og forhandler — ikke mekaniker. */
export function kanSkriveDealerDesk(input: {
  role: Role | string | null | undefined;
  jobFunction?: string | null;
  isMechanic?: boolean;
}): boolean {
  if (input.role === 'dealer_admin' || input.role === 'endwise_admin') return true;
  if (input.role !== 'dealer_staff') return false;
  if (erMekanikerKonto(input)) return false;
  return kan('dealer_staff', 'booking', 'create');
}
