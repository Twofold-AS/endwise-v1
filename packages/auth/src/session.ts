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
 * Better-Auth-sesjonskake (`cookiePrefix: 'endwise'`).
 * Prod (`useSecureCookies`): `__Secure-endwise.session_token`.
 * Dev: `endwise.session_token`. Ingen kake = ingen sesjon — hopp over
 * `getSession`/DB. Produktregler (idle, absolut, 2FA) gjelder når kaken finnes.
 */
const SESJON_KAKE = /(?:^|;\s*)(?:__Secure-)?endwise\.session_token=/;

export function harSesjonsCookie(headers: Headers): boolean {
  return SESJON_KAKE.test(headers.get('cookie') ?? '');
}

/**
 * Samme orden som `connectionTimeoutMillis` (5s). Ikke 0 — 0 er «vent evig»
 * i node-pg. Layout/tRPC skal få nei innen denne fristen, ikke henge.
 */
export const SESSION_LOOKUP_TIMEOUT_MS = 5_000;

export async function medTidsfrist<T>(arbeid: Promise<T>, ms: number, melding: string): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      arbeid,
      new Promise<T>((_, reject) => {
        t = setTimeout(() => reject(new Error(melding)), ms);
      }),
    ]);
  } finally {
    if (t !== undefined) clearTimeout(t);
  }
}

/**
 * F1-12 + F1-11 — Serverside sesjonssjekk. Alle beskyttede flater går gjennom
 * denne.
 * Tre grenser, og de feiler ulikt:
 * 1. Idle — Better-Auth håndhever selv (expiresIn/updateAge).
 * 2. Absolutt — maks levetid. Better-Auth har ingen innebygd; vi river
 * sesjonen i databasen når den er passert. En klient-timer
 * ville ikke vært en grense; dette er.
 * 3. 2FA — TOTP er valgfri. `assertTwoFactorForUser` blokkerer ikke
 * uenrollerte. Bundet TOTP håndheves ved neste magic-link-verify.
 * `db` er et påkrevd argument, ikke valgfritt. Gjorde vi det valgfritt,
 * ville et kallsted som glemte å sende det stille hoppet over 2FA-sjekken — og
 * det er nøyaktig den feilen denne funksjonen finnes for å hindre. Nå må hvert
 * kallsted ta stilling, og TypeScript nekter å kompilere hvis noen glemmer.
 */
export async function requireSession(auth: Auth, db: Database, headers: Headers) {
  const data = await medTidsfrist(
    auth.api.getSession({ headers }),
    SESSION_LOOKUP_TIMEOUT_MS,
    'Sesjonsoppslag tok for lang tid',
  );
  if (!data) throw new SessionExpiredError('idle');

  if (isBeyondAbsoluteLifetime(data.session)) {
    await auth.api.revokeSession({
      headers,
      body: { token: data.session.token },
    });
    throw new SessionExpiredError('absolute');
  }

  // TOTP er valgfri: uenrollert får bruke appen. Kall beholdes så
  // requireSession fortsatt er én inngang (idle + absolut + ev. fremtidig gate).
  await assertTwoFactorForUser(db, data.user.id, data.user.twoFactorEnabled);

  return data;
}
