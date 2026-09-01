/**
 * Bytt E-POST i to steg: be om bytte, deretter bekreft.
 * E-posten skal aldri byttes i samme klikk som forespørselen. En åpen
 * sesjon (eller et skjema som kaller `updateUser({ email })`) er en vei til
 * å stjele kontoen: angriperen peker innloggingen mot sin egen innboks, og
 * offeret er ute. Sperren er Better-Auth `changeEmail` med verifisering, pluss
 * at `updateEmailWithoutVerification` ikke står på.
 * Stegene:
 * 1. Be om bytte (ny adresse + gjeldende passord, som F1-22).
 * 2. Bekreft fra den adressen brukeren har (sendChangeEmailConfirmation).
 * 3. Better-Auth sender deretter en lenke til den nye adressen. Først når
 * den åpnes, skrives e-posten. Steg 2+3 er bekreftelsen — ikke ett klikk.
 * Denne fila importeres av web-klienten (`@endwise/auth/bytt-epost`).
 * Ingen Better-Auth-serverimport her.
 */

/** Better-Auth-stien. Rate-limit-nøkkelen må treffe den eksakt. */
export const BYTT_EPOST_STI = '/change-email';

/** Sida som konsumerer bekreftelsestokenet (steg 2). */
export const BEKREFT_EPOST_STI = '/bekreft-epost';

/** Etter vellykket bekreftelse. Settings er en lenke hit — ingen flyout. */
export const BYTT_EPOST_CALLBACK = '/innstillinger/profil?epost=ok';

/**
 * Rate-limit på å be om bytte: 5 per minutt, per IP.
 * Samme tak som bytt-passord / 2FA-av (F1-17 / F1-22). En ekte bruker treffer
 * endepunktet én gang. Fem i minuttet er raust for dem og fiendtlig for
 * noen som kverner adresser mot en åpen sesjon.
 */
export const BYTT_EPOST_RATE_GRENSE = { window: 60, max: 5 } as const;

export const BYTT_EPOST_GENERISK_FEILKODE = 'CHANGE_EMAIL_FAILED';
export const BYTT_EPOST_GENERISK_MELDING = 'Kunne ikke be om e-postbytte.';

export type ByttEpostInput = {
  nyEpost: string;
  bekreft: string;
  totp?: string;
  passord?: string;
};

export type ByttEpostOk = {
  ok: true;
  nyEpost: string;
};

export type ByttEpostFeil = {
  ok: false;
  feil: string;
};

const EPOST = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Klientvalidering for Settings › Profil.
 * Trim er den samme lærdommen som `/signin`: et limt inn mellomrom bak
 * prikkene gir nøyaktig samme feil som feil passord.
 */
export function validerByttEpost(input: ByttEpostInput): ByttEpostOk | ByttEpostFeil {
  const nyEpost = input.nyEpost.trim().toLowerCase();
  const bekreft = input.bekreft.trim().toLowerCase();
  if (!nyEpost || !EPOST.test(nyEpost)) {
    return { ok: false, feil: 'Skriv en gyldig ny e-postadresse.' };
  }
  if (nyEpost !== bekreft) {
    return { ok: false, feil: 'De to e-postadressene er ikke like.' };
  }
  const totp = typeof input.totp === 'string' ? input.totp.replace(/\D/g, '') : '';
  if (!/^\d{6}$/.test(totp)) {
    return { ok: false, feil: 'Skriv en fersk kode fra autentikator-appen.' };
  }
  return { ok: true, nyEpost };
}

/**
 * Payloaden til Better-Auth `changeEmail`.
 * Ingen `email` her — det feltet tilhører `updateUser` og ville byttet
 * adressen uten bekreftelse. `password` følger med så serverhooken kan
 * kreve det (F1-22-mønsteret). Handleren selv kjenner det ikke.
 */
/** Bygger vår bekreftelseslenke. Tokenet er det Better-Auth allerede laget. */
export function byttEpostLenke(token: string): string {
  return `${BEKREFT_EPOST_STI}?token=${encodeURIComponent(token)}`;
}

export function byttEpostKall(
  ok: ByttEpostOk,
  totp?: string,
): {
  newEmail: string;
  callbackURL: typeof BYTT_EPOST_CALLBACK;
  totp?: string;
} {
  return {
    newEmail: ok.nyEpost,
    callbackURL: BYTT_EPOST_CALLBACK,
    ...(totp ? { totp } : {}),
  };
}

/**
 * Den delen av Better-Auth-konfigurasjonen denne modulen har en mening om.
 * Strukturell med vilje, ikke `BetterAuthOptions` — samme grep som
 * `passordResetHull` / `byttPassordHull`.
 */
export type ByttEpostKonfig = {
  user?: {
    changeEmail?: {
      enabled?: boolean;
      updateEmailWithoutVerification?: boolean;
      sendChangeEmailConfirmation?: unknown;
    };
  };
  emailVerification?: {
    sendVerificationEmail?: unknown;
    sendOnSignUp?: boolean;
  };
  rateLimit?: {
    customRules?: Record<string, unknown>;
  };
};

function grenseErStrammereEnn(regel: unknown, tak: { window: number; max: number }): boolean {
  if (typeof regel !== 'object' || regel === null) return false;
  const { window: vindu, max } = regel as { window?: unknown; max?: unknown };
  if (typeof vindu !== 'number' || typeof max !== 'number') return false;
  return vindu >= tak.window && max <= tak.max;
}

/**
 * Hvilke herdingskrav er ikke oppfylt? Tom liste = alt i orden.
 * En slått-av `changeEmail`, eller `updateEmailWithoutVerification: true`,
 * blir en hard testfeil — ikke en stille default som bytter e-post i ett klikk.
 */
export function byttEpostHull(konfig: ByttEpostKonfig): string[] {
  const hull: string[] = [];
  const bytte = konfig.user?.changeEmail;

  if (bytte?.enabled !== true) {
    hull.push(
      'user.changeEmail.enabled må være true — ellers finnes ingen to-stegs flyt, og UI-et later som bytte er umulig',
    );
  }
  if (bytte?.updateEmailWithoutVerification === true) {
    hull.push(
      'user.changeEmail.updateEmailWithoutVerification må IKKE være true — det bytter e-post uten bekreftelse (ett klikk)',
    );
  }
  if (typeof bytte?.sendChangeEmailConfirmation !== 'function') {
    hull.push(
      'user.changeEmail.sendChangeEmailConfirmation mangler — uten den bekreftes byttet aldri fra adressen brukeren HAR',
    );
  }
  if (typeof konfig.emailVerification?.sendVerificationEmail !== 'function') {
    hull.push(
      'emailVerification.sendVerificationEmail mangler — Better-Auth nekter da hele changeEmail-flyten',
    );
  }

  const regler = konfig.rateLimit?.customRules ?? {};
  if (!grenseErStrammereEnn(regler[BYTT_EPOST_STI], BYTT_EPOST_RATE_GRENSE)) {
    hull.push(
      `rateLimit.customRules["${BYTT_EPOST_STI}"] mangler eller er slakkere enn ${BYTT_EPOST_RATE_GRENSE.max} per ${BYTT_EPOST_RATE_GRENSE.window}s`,
    );
  }

  return hull;
}

export function assertByttEpostHerdet(konfig: ByttEpostKonfig): void {
  const hull = byttEpostHull(konfig);
  if (hull.length > 0) {
    throw new Error(`Bytt-e-post er ikke herdet:\n  · ${hull.join('\n  · ')}`);
  }
}
