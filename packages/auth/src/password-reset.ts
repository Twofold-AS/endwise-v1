/**
 * F1-15 / F1-16 — passordreset: grensene, samlet ett sted.
 * Hvorfor denne fila finnes
 * Selve flyten er Better-Auths (`/request-password-reset` → e-post →
 * `/reset-password`). Det vi eier er **hvor stramt den er skrudd**, og de
 * innstillingene er spredt over `emailAndPassword` og `rateLimit` i
 * `auth.ts`. Fire av dem er sikkerhetsgrenser der Better-Auths standardverdi
 * er den utrygge:
 * `revokeSessionsOnPasswordReset` — **default `false`**
 * `resetPasswordTokenExpiresIn` — default 1 time
 * rate-limit på `/request-password-reset` — default 3 per minutt
 * `sendResetPassword` — uten den er hele ruta av
 * En slått av ved et uhell gir ingen feilmelding og ingen rød test. Derfor
 * ligger reglene her som data, og `passordResetHull` er sperren som gjør et
 * bortfall til en hard testfeil. Samme grep som `two-factor.ts`: den rene
 * avgjørelsen skilles ut nettopp fordi en regel som bare finnes inne i et
 * konfigurasjonsobjekt er en regel ingen tester.
 * Hva denne flyten ikke beskytter mot
 * Andre faktor (F1-11) er en engangskode på **e-post**, og resetlenka går til
 * samme innboks. Den som eier innboksen får dermed begge. Resetflyten gjør
 * ikke dette verre — den arver det av e-post-2FA — men den gjør det synlig,
 * og det er hele argumentet for F1-21 (gjenopprettingskoder) og F1-24
 * (autentikator-app). Ikke skriv om denne kommentaren til noe som høres
 * tryggere ut enn flyten er.
 */

/**
 * Lenkas levetid: **30 minutter**.
 * Kortere enn Better-Auths time, og bevisst mye kortere enn invitasjonens sju
 * dager (F1-10). Forskjellen er hva lenka Åpner: en invitasjon lager en konto
 * som ikke finnes ennå, en resetlenke er en nøkkel til en konto som finnes og
 * har data i seg. En slik nøkkel skal ikke ligge og gjelde i en innboks.
 * 30 minutter er langt nok til å finne e-posten, bytte enhet og skrive et
 * passord man må finne på — og kort nok til at lenka er død lenge før noen
 * blar i gamle meldinger.
 */
export const PASSORD_RESET_TTL_SEKUNDER = 1_800;

/** Taket `passordResetHull` håndhever. Over dette er lenka ikke lenger kortlivet. */
export const PASSORD_RESET_TTL_MAKS_SEKUNDER = 3_600;

/** Better-Auth-stiene. Navngitt fordi rate-limit-nøklene må treffe dem eksakt. */
export const RESET_BE_OM_STI = '/request-password-reset';
export const RESET_SETT_STI = '/reset-password';

/**
 * Rate-limit på å be om en lenke: 5 per kvarter, per IP.
 * Better-Auths standard for denne stien er 3 per **minutt** — som er 180 i
 * timen. Det er rikelig til to angrep som ikke krever at man gjetter noe:
 * å fylle en innboks med resetvarsler, og å kverne e-postadresser mot
 * endepunktet. Svaret lekker riktignok ikke om adressen finnes (se
 * `auth.ts`), men volumet i seg selv er angrepet her.
 * Et menneske trenger én forespørsel, kanskje to hvis den første e-posten
 * drøyer. Fem i kvarteret er raust for dem og fiendtlig for alt annet.
 */
export const RESET_BE_OM_GRENSE = { window: 900, max: 5 } as const;

/**
 * Rate-limit på å sette nytt passord: 10 per kvarter, per IP.
 * Tokenet er 24 tegn fra Better-Auths `generateId` — det gjettes ikke uansett.
 * Grensen står der fordi et endepunkt som tar imot et hemmelig token og svarer
 * ulikt på gyldig og ugyldig, alltid skal ha et tak. Den koster ingenting for
 * en ekte bruker, som treffer den én gang.
 */
export const RESET_SETT_GRENSE = { window: 900, max: 10 } as const;

/** Sida i web-appen der brukeren skriver det nye passordet (F1-16). */
export const NYTT_PASSORD_STI = '/nytt-passord';

/** Sida der brukeren ber om lenka (F1-15). */
export const GLEMT_PASSORD_STI = '/glemt-passord';

/**
 * Den delen av Better-Auth-konfigurasjonen denne modulen har en mening om.
 * Strukturell med vilje, ikke `BetterAuthOptions`. Da kan `passordResetHull`
 * testes mot håndlagde objekter — inkludert de ugyldige variantene, som er de
 * eneste som beviser at sperren virker.
 */
export type ResetKonfig = {
  emailAndPassword?: {
    enabled?: boolean;
    sendResetPassword?: unknown;
    resetPasswordTokenExpiresIn?: number;
    revokeSessionsOnPasswordReset?: boolean;
    minPasswordLength?: number;
  };
  rateLimit?: {
    customRules?: Record<string, unknown>;
  };
};

function grenseErStrammereEnn(regel: unknown, tak: { window: number; max: number }): boolean {
  if (typeof regel !== 'object' || regel === null) return false;
  const { window: vindu, max } = regel as { window?: unknown; max?: unknown };
  if (typeof vindu !== 'number' || typeof max !== 'number') return false;
  // Samme eller strammere: like langt vindu og ikke flere forsøk.
  return vindu >= tak.window && max <= tak.max;
}

/**
 * Hvilke herdingskrav er ikke oppfylt? Tom liste = alt i orden.
 * Returnerer strenger og ikke et boolsk svar fordi en test som feiler skal
 * si hva som mangler. «forventet true, fikk false» på en konfigurasjonssjekk
 * er nesten like lite hjelp som ingen test.
 */
export function passordResetHull(konfig: ResetKonfig): string[] {
  const hull: string[] = [];
  const ep = konfig.emailAndPassword;
  const regler = konfig.rateLimit?.customRules ?? {};

  /**
   * Passord er av. Reset-stien skal ikke finnes. Tom hull-liste når
   * `enabled !== true` er den herdete tilstanden — ikke et hull.
   */
  if (ep?.enabled !== true) {
    return hull;
  }
  if (typeof ep?.sendResetPassword !== 'function') {
    hull.push(
      'emailAndPassword.sendResetPassword mangler — Better-Auth svarer da RESET_PASSWORD_DISABLED og hele flyten er av',
    );
  }

  const ttl = ep?.resetPasswordTokenExpiresIn;
  if (typeof ttl !== 'number' || ttl <= 0) {
    hull.push(
      'emailAndPassword.resetPasswordTokenExpiresIn må settes eksplisitt (Better-Auths default er 1 time)',
    );
  } else if (ttl > PASSORD_RESET_TTL_MAKS_SEKUNDER) {
    hull.push(
      `emailAndPassword.resetPasswordTokenExpiresIn er ${ttl}s — taket er ${PASSORD_RESET_TTL_MAKS_SEKUNDER}s`,
    );
  }

  if (ep?.revokeSessionsOnPasswordReset !== true) {
    // Den viktigste av de fem. Se `auth.ts` for hvorfor.
    hull.push(
      'emailAndPassword.revokeSessionsOnPasswordReset må være true — ellers overlever angriperens sesjon at offeret «tar tilbake» kontoen',
    );
  }

  if (!grenseErStrammereEnn(regler[RESET_BE_OM_STI], RESET_BE_OM_GRENSE)) {
    hull.push(
      `rateLimit.customRules["${RESET_BE_OM_STI}"] mangler eller er slakkere enn ${RESET_BE_OM_GRENSE.max} per ${RESET_BE_OM_GRENSE.window}s`,
    );
  }
  if (!grenseErStrammereEnn(regler[RESET_SETT_STI], RESET_SETT_GRENSE)) {
    hull.push(
      `rateLimit.customRules["${RESET_SETT_STI}"] mangler eller er slakkere enn ${RESET_SETT_GRENSE.max} per ${RESET_SETT_GRENSE.window}s`,
    );
  }

  return hull;
}

/** Kaster hvis noe krav ikke er oppfylt. Tenkt brukt i test og ved oppstart. */
export function assertPassordResetHerdet(konfig: ResetKonfig): void {
  const hull = passordResetHull(konfig);
  if (hull.length > 0) {
    throw new Error(`Passordreset er ikke herdet:\n  · ${hull.join('\n  · ')}`);
  }
}
