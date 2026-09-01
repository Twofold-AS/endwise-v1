/**
 * Magic link-innlogging (erstatter passord).
 * Lenka beviser innboks. Andre faktor er TOTP — ikke e-postkode.
 */

export const MAGIC_LINK_TTL_SEKUNDER = 600;
export const MAGIC_LINK_BE_OM_STI = '/sign-in/magic-link';
export const MAGIC_LINK_VERIFY_STI = '/magic-link/verify';
export const MAGIC_LINK_CALLBACK = '/signin';
export const MAGIC_LINK_TOTP_QUERY = 'steg=totp';
export const MAGIC_LINK_ENROLL_STI = '/2fa-oppsett';

/** Samme tak som gammel e-post-innlogging: 5 per minutt per IP. */
export const MAGIC_LINK_BE_OM_GRENSE = { window: 60, max: 5 } as const;
export const MAGIC_LINK_VERIFY_GRENSE = { window: 60, max: 5 } as const;
