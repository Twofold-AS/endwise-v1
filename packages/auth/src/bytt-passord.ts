/**
 * Bytt passord mens du er innlogget.
 * Reset (F1-16) er for den som ikke kan passordet. Denne flyten er det
 * motsatte: Better-Auth `changePassword` krever gjeldende passord, som er
 * re-autentiseringen Settings-sjekklista ber om for sikkerhetsfelter.
 * Hva vi eier her
 * Selve kallet er Better-Auths. Det vi eier er valideringen før kallet, og
 * herdingen Better-Auths default ikke gir:
 * CWE-613 — `/change-password` respekterer `revokeOtherSessions` fra
 * request-body. Default `false`. En klient som utelater flagget, eller
 * en angriper som kaller API-et direkte, lar andre sesjoner leve.
 * Sperren er `hooks.before` i `bytt-passord-server.ts`, som tvinger
 * flagget til `true` før handleren kjører. `byttPassordKall` er et
 * ekstra lag, ikke sperren.
 * CWE-307 — Better-Auth har ingen egen rate-limit på stien. Uten en
 * `customRules`-oppføring arver den den slakke globalen (60/min).
 * CWE-209 / CWE-287 — handleren svarer `INVALID_PASSWORD` når det
 * gjeldende passordet er feil. Det er en orakel-lekkasje. `hooks.after`
 * mapper den (og like auth-feil) til én generisk kode.
 * Klientsjekkene er bekvemmelighet, ikke sikkerhet: serveren håndhever
 * `minPasswordLength: 12` uansett. Uten sjekken her får brukeren en engelsk
 * feil etter å ha fylt tre felt.
 * Denne fila importeres av web-klienten (`@endwise/auth/bytt-passord`).
 * Ingen Better-Auth-serverimport her — da følger hele auth-grafen med i
 * bundle. Hookene bor i `bytt-passord-server.ts`.
 */

/** Samme gulv som `emailAndPassword.minPasswordLength` i `auth.ts`. */
export const BYTT_PASSORD_MIN_LENGDE = 12;

/** Better-Auth-stien. Navngitt fordi rate-limit-nøkkelen må treffe den eksakt. */
export const BYTT_PASSORD_STI = '/change-password';

/**
 * 2FA-endepunkter som også sjekker passord. Samme brute-force-trussel som
 * bytt-passord: en åpen sesjon + gjetting av gjeldende passord.
 */
export const TO_FAKTOR_ENABLE_STI = '/two-factor/enable';
export const TO_FAKTOR_DISABLE_STI = '/two-factor/disable';
export const TO_FAKTOR_VERIFY_TOTP_STI = '/two-factor/verify-totp';
export const TO_FAKTOR_VERIFY_BACKUP_STI = '/two-factor/verify-backup-code';
export const TO_FAKTOR_SEND_OTP_STI = '/two-factor/send-otp';

/**
 * Rate-limit på å bytte passord: 5 per minutt, per IP.
 * Trusselen er den samme som `/sign-in/email` (5/60s): nettverksside gjetting
 * av et passord. En ekte bruker treffer endepunktet én gang, kanskje tre hvis
 * hen taster feil. Fem i minuttet er raust for dem og fiendtlig for alt annet.
 */
export const BYTT_PASSORD_RATE_GRENSE = { window: 60, max: 5 } as const;

/** Samme tak som bytt-passord, for `enable`/`disable` som krever passord. */
export const KREDENTIAL_MUTASJON_RATE_GRENSE = { window: 60, max: 5 } as const;

/** API-svaret når gjeldende passord er feil eller en annen auth-feil treffer. */
export const BYTT_PASSORD_GENERISK_FEILKODE = 'CHANGE_PASSWORD_FAILED';
export const BYTT_PASSORD_GENERISK_MELDING = 'Kunne ikke bytte passordet.';

export const KREDENTIAL_MUTASJON_GENERISK_FEILKODE = 'CREDENTIAL_MUTATION_FAILED';
export const KREDENTIAL_MUTASJON_GENERISK_MELDING = 'Kunne ikke bekrefte handlingen.';

/** Identitet `byttPassordHull` krever på `hooks.before` / `hooks.after`. */
export const BYTT_PASSORD_FOR_HOOK_ID = 'tving-revoke-other-sessions';
export const BYTT_PASSORD_ETTER_HOOK_ID = 'skjul-auth-feilkode';

const SKJULTE_AUTH_KODER = new Set(['INVALID_PASSWORD', 'CREDENTIAL_ACCOUNT_NOT_FOUND']);

/** Auth-feil som ikke skal skilles fra hverandre i API-svaret. */
export function erSkjultAuthFeilkode(code: string | undefined): boolean {
  return code !== undefined && SKJULTE_AUTH_KODER.has(code);
}

/** Samme form uansett hvilken av de skjulte kodene som kom inn. */
export function generiskAuthFeilForSti(path: string): { code: string; message: string } {
  if (path === BYTT_PASSORD_STI) {
    return { code: BYTT_PASSORD_GENERISK_FEILKODE, message: BYTT_PASSORD_GENERISK_MELDING };
  }
  return {
    code: KREDENTIAL_MUTASJON_GENERISK_FEILKODE,
    message: KREDENTIAL_MUTASJON_GENERISK_MELDING,
  };
}

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
 * `revokeOtherSessions` er ikke valgfritt her. Default `false` ville latt
 * en stjålet sesjon på en annen enhet overleve at eieren byttet passord.
 * Dette er klientlaget. Sperren er `hooks.before` som tvinger flagget
 * uansett hva request-body sier. Se `byttPassordHull`.
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

/**
 * Den delen av Better-Auth-konfigurasjonen denne modulen har en mening om.
 * Strukturell med vilje, ikke `BetterAuthOptions` — samme grep som
 * `passordResetHull`. Da kan sperren testes mot håndlagde objekter.
 */
export type ByttPassordKonfig = {
  rateLimit?: {
    customRules?: Record<string, unknown>;
  };
  hooks?: {
    before?: { endwiseId?: string } | unknown;
    after?: { endwiseId?: string } | unknown;
  };
};

function grenseErStrammereEnn(regel: unknown, tak: { window: number; max: number }): boolean {
  if (typeof regel !== 'object' || regel === null) return false;
  const { window: vindu, max } = regel as { window?: unknown; max?: unknown };
  if (typeof vindu !== 'number' || typeof max !== 'number') return false;
  return vindu >= tak.window && max <= tak.max;
}

function hookId(hook: unknown): string | undefined {
  if (typeof hook !== 'function' && (typeof hook !== 'object' || hook === null)) {
    return undefined;
  }
  const id = (hook as { endwiseId?: unknown }).endwiseId;
  return typeof id === 'string' ? id : undefined;
}

/**
 * Hvilke herdingskrav er ikke oppfylt? Tom liste = alt i orden.
 * CWE-613 uten server-hook, CWE-307 uten rate-limit, eller en hook som ikke
 * er den navngitte sperren, blir en hard testfeil — ikke en stille default.
 */
export function byttPassordHull(konfig: ByttPassordKonfig): string[] {
  const hull: string[] = [];
  const regler = konfig.rateLimit?.customRules ?? {};

  if (!grenseErStrammereEnn(regler[BYTT_PASSORD_STI], BYTT_PASSORD_RATE_GRENSE)) {
    hull.push(
      `rateLimit.customRules["${BYTT_PASSORD_STI}"] mangler eller er slakkere enn ${BYTT_PASSORD_RATE_GRENSE.max} per ${BYTT_PASSORD_RATE_GRENSE.window}s`,
    );
  }
  if (!grenseErStrammereEnn(regler[TO_FAKTOR_ENABLE_STI], KREDENTIAL_MUTASJON_RATE_GRENSE)) {
    hull.push(
      `rateLimit.customRules["${TO_FAKTOR_ENABLE_STI}"] mangler eller er slakkere enn ${KREDENTIAL_MUTASJON_RATE_GRENSE.max} per ${KREDENTIAL_MUTASJON_RATE_GRENSE.window}s`,
    );
  }
  if (!grenseErStrammereEnn(regler[TO_FAKTOR_DISABLE_STI], KREDENTIAL_MUTASJON_RATE_GRENSE)) {
    hull.push(
      `rateLimit.customRules["${TO_FAKTOR_DISABLE_STI}"] mangler eller er slakkere enn ${KREDENTIAL_MUTASJON_RATE_GRENSE.max} per ${KREDENTIAL_MUTASJON_RATE_GRENSE.window}s`,
    );
  }

  if (hookId(konfig.hooks?.before) !== BYTT_PASSORD_FOR_HOOK_ID) {
    hull.push(
      'hooks.before må tvinge revokeOtherSessions på /change-password — klientflagget er ikke en sperre (CWE-613)',
    );
  }
  if (hookId(konfig.hooks?.after) !== BYTT_PASSORD_ETTER_HOOK_ID) {
    hull.push(
      'hooks.after må mappe INVALID_PASSWORD til generisk auth-feil — ellers lekker API-et om det gamle passordet var feil (CWE-209)',
    );
  }

  return hull;
}

/** Kaster hvis noe krav ikke er oppfylt. Tenkt brukt i test og ved oppstart. */
export function assertByttPassordHerdet(konfig: ByttPassordKonfig): void {
  const hull = byttPassordHull(konfig);
  if (hull.length > 0) {
    throw new Error(`Bytt-passord er ikke herdet:\n  · ${hull.join('\n  · ')}`);
  }
}
