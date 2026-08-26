/**
 * Sesjonspolicy (CWE-613, ASVS 3.3).
 * To grenser, ikke én:
 * idle: 60 min uten aktivitet -> ut. Glidende vindu, håndhevet serverside
 * (Better-Auth `expiresIn` + `updateAge`), ikke en klient-timer.
 * absolutt: uansett aktivitet dør sesjonen etter maks-levetiden. Better-Auth
 * har ingen innebygd absolutt levetid — derfor feltet
 * `absoluteExpiresAt` på sesjonen + sjekken under.
 */
export const IDLE_TIMEOUT_SECONDS = 60 * 60; // 60 min
export const SESSION_UPDATE_AGE_SECONDS = 5 * 60; // rull vinduet maks hvert 5. min
export const ABSOLUTE_MAX_LIFETIME_SECONDS = 12 * 60 * 60; // 12 t

export interface SessionLike {
  createdAt: Date | string;
  absoluteExpiresAt?: Date | string | null;
}

export function absoluteExpiryFor(createdAt: Date = new Date()): Date {
  return new Date(createdAt.getTime() + ABSOLUTE_MAX_LIFETIME_SECONDS * 1000);
}

/** True = sesjonen har passert absolutt maks-levetid og skal invalideres. */
export function isBeyondAbsoluteLifetime(session: SessionLike, now: Date = new Date()): boolean {
  const absolute = session.absoluteExpiresAt
    ? new Date(session.absoluteExpiresAt)
    : absoluteExpiryFor(new Date(session.createdAt));
  return now >= absolute;
}
