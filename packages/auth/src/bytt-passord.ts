/**
 * F1-17 — BYTT PASSORD mens du er innlogget.
 *
 * Reset (F1-16) er for den som IKKE kan passordet. Denne flyten er det
 * motsatte: Better-Auth `changePassword` krever gjeldende passord, som er
 * re-autentiseringen Settings-sjekklista ber om for sikkerhetsfelter.
 *
 * ── Hva vi eier her ──────────────────────────────────────────────────────
 * Selve kallet er Better-Auths. Det vi eier er valideringen FØR kallet, og
 * at `revokeOtherSessions` alltid er `true`. Better-Auths default er å la
 * andre sesjoner leve — samme felle som `revokeSessionsOnPasswordReset`.
 *
 * Klientsjekkene er bekvemmelighet, ikke sikkerhet: serveren håndhever
 * `minPasswordLength: 12` uansett. Uten sjekken her får brukeren en engelsk
 * feil etter å ha fylt tre felt.
 */

/** Samme gulv som `emailAndPassword.minPasswordLength` i `auth.ts`. */
export const BYTT_PASSORD_MIN_LENGDE = 12;

export type ByttPassordInput = {
  gjeldende: string;
  nytt: string;
  bekreft: string;
};

export type ByttPassordOk = {
  ok: true;
  gjeldende: string;
  nytt: string;
};

export type ByttPassordFeil = {
  ok: false;
  feil: string;
};

/**
 * Klientvalidering for Settings › Profil og mekanikerens «Meg».
 *
 * Trim er den samme lærdommen som `/signin`: et limt inn mellomrom er
 * usynlig bak prikkene og gir nøyaktig samme 401 som feil passord.
 */
export function validerByttPassord(input: ByttPassordInput): ByttPassordOk | ByttPassordFeil {
  const gjeldende = input.gjeldende.trim();
  const nytt = input.nytt.trim();
  const bekreft = input.bekreft.trim();

  if (!gjeldende) {
    return { ok: false, feil: 'Skriv det gjeldende passordet før du bytter.' };
  }
  if (nytt !== bekreft) {
    return { ok: false, feil: 'De to nye passordene er ikke like.' };
  }
  if (nytt.length < BYTT_PASSORD_MIN_LENGDE) {
    return { ok: false, feil: `Passordet må være minst ${BYTT_PASSORD_MIN_LENGDE} tegn.` };
  }
  if (nytt === gjeldende) {
    return { ok: false, feil: 'Det nye passordet må være forskjellig fra det du har nå.' };
  }
  return { ok: true, gjeldende, nytt };
}

/**
 * Payloaden til Better-Auth `changePassword`.
 *
 * ⛔ `revokeOtherSessions` er IKKE valgfritt her. Default `false` ville latt
 * en stjålet sesjon på en annen enhet overleve at eieren byttet passord.
 */
export function byttPassordKall(ok: ByttPassordOk): {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions: true;
} {
  return {
    currentPassword: ok.gjeldende,
    newPassword: ok.nytt,
    revokeOtherSessions: true,
  };
}
