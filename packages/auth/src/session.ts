import type { Auth } from './auth.ts';
import { isBeyondAbsoluteLifetime } from './session-policy.ts';

export class SessionExpiredError extends Error {
  readonly code = 'SESSION_EXPIRED';
  constructor(reason: 'idle' | 'absolute') {
    super(reason === 'absolute' ? 'Sesjonen har nådd maks levetid' : 'Sesjonen er utløpt');
  }
}

/**
 * F1-12 — Serverside sesjonssjekk. ALLE beskyttede flater går gjennom denne.
 *
 * Better-Auth håndhever idle-vinduet selv (expiresIn/updateAge). Den absolutte
 * maks-levetiden gjør ikke den — så vi sjekker den her, og river sesjonen ned
 * i databasen når den er passert. En klient-timer ville ikke vært en grense;
 * dette er.
 */
export async function requireSession(auth: Auth, headers: Headers) {
  const data = await auth.api.getSession({ headers });
  if (!data) throw new SessionExpiredError('idle');

  if (isBeyondAbsoluteLifetime(data.session)) {
    await auth.api.revokeSession({
      headers,
      body: { token: data.session.token },
    });
    throw new SessionExpiredError('absolute');
  }

  return data;
}
