/**
 * Enroll-vindu etter magic-link uten TOTP.
 * Ingen app-sesjon. Kortlivet kake, samme idé som two_factor-kaken.
 * Bare /2fa-oppsett + enable/verify-totp kan bruke den.
 */

export const ENROLL_COOKIE_NAME = 'enroll_2fa';
export const ENROLL_COOKIE_MAX_AGE = 600;
export const ENROLL_IDENTIFIER_PREFIX = 'enroll-';

export function erEnrollIdentifier(identifier: string): boolean {
  return identifier.startsWith(ENROLL_IDENTIFIER_PREFIX);
}

export function byggEnrollIdentifier(hex: string): string {
  return `${ENROLL_IDENTIFIER_PREFIX}${hex}`;
}

export type EnrollSesjon = {
  session: {
    id: string;
    token: string;
    userId: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
    ipAddress?: string;
    userAgent?: string;
  };
  user: {
    id: string;
    email: string;
    name?: string | null;
    emailVerified?: boolean;
    twoFactorEnabled?: boolean | null;
    image?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  };
};

/** Syntetisk sesjon for Better-Auth enable/verify — uten sesjonskake. */
export function byggEnrollSesjon(user: EnrollSesjon['user']): EnrollSesjon {
  const now = new Date();
  return {
    session: {
      id: `enroll-sesjon-${user.id}`,
      token: `enroll-token-${user.id}`,
      userId: user.id,
      expiresAt: new Date(now.getTime() + ENROLL_COOKIE_MAX_AGE * 1000),
      createdAt: now,
      updatedAt: now,
    },
    user,
  };
}
