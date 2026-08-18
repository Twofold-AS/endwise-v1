import type { Database } from '@endwise/db';
import type { Auth } from './auth.ts';
import { isBeyondAbsoluteLifetime } from './session-policy.ts';
import { assertTwoFactorForUser } from './two-factor.ts';

export class SessionExpiredError extends Error {
  readonly code = 'SESSION_EXPIRED';
  constructor(reason: 'idle' | 'absolute') {
    super(reason === 'absolute' ? 'Sesjonen har nådd maks levetid' : 'Sesjonen er utløpt');
  }
}

/**
 * F1-12 + F1-11 — Serverside sesjonssjekk. ALLE beskyttede flater går gjennom
 * denne.
 *
 * Tre grenser, og de feiler ULIKT:
 *   1. IDLE      — Better-Auth håndhever selv (expiresIn/updateAge).
 *   2. ABSOLUTT  — maks levetid. Better-Auth har ingen innebygd; vi river
 *                  sesjonen i databasen når den er passert. En klient-timer
 *                  ville ikke vært en grense; dette er.
 *   3. 2FA       — ⛔ NY 12.08.2026. Roller som krever tofaktor får ingen
 *                  autorisert sesjon uten det. Se `two-factor.ts`.
 *
 * ⚠️ **`db` er et PÅKREVD argument, ikke valgfritt.** Gjorde vi det valgfritt,
 * ville et kallsted som glemte å sende det stille hoppet over 2FA-sjekken — og
 * det er nøyaktig den feilen denne funksjonen finnes for å hindre. Nå må hvert
 * kallsted ta stilling, og TypeScript nekter å kompilere hvis noen glemmer.
 */
export async function requireSession(auth: Auth, db: Database, headers: Headers) {
  const data = await auth.api.getSession({ headers });
  if (!data) throw new SessionExpiredError('idle');

  if (isBeyondAbsoluteLifetime(data.session)) {
    await auth.api.revokeSession({
      headers,
      body: { token: data.session.token },
    });
    throw new SessionExpiredError('absolute');
  }

  // ⛔ Kaster TwoFactorRequiredError. Kallstedene oversetter den til en EGEN
  // feilkode (ikke 401), slik at UI-et kan sende brukeren til oppsett i stedet
  // for til innloggingsskjermen hen nettopp kom fra.
  await assertTwoFactorForUser(db, data.user.id, data.user.twoFactorEnabled);

  return data;
}
