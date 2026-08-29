/**
 * F1-20 / F1-21 / F1-22 / F1-23 — 2FA-status, gjenopprettingskoder,
 * slå-av og kvittering etter påslag.
 * Hvorfor navigasjonen er skilt fra «ferdig»
 * `/2fa-oppsett` satte `steg = 'ferdig'` og kalte `window.location.assign`
 * i samme blokk. Tilstanden rakk aldri å rendre — brukeren så aldri at det
 * gikk bra. Derfor returnerer `etter2faBekreftet` kun «vis kvittering».
 * Navigasjon skjer først når brukeren trykker Fortsett.
 * Kodene kommer fra `enable`, ikke fra et eget kall
 * Better-Auth 1.6.23 lager backupCodes i `/two-factor/enable` og returnerer
 * dem i klartekst ÉN gang. `generateBackupCodes` er for å bytte sett senere
 * (krever at 2FA allerede er på). Vi viser det enable allerede ga oss.
 */

export type ToFaktorSteg = 'passord' | 'kode' | 'koder' | 'av' | 'ferdig';

export type Etter2faBekreftet = {
  steg: 'ferdig';
  /** Alltid null. Navigasjon hører til `fortsettEtter2faKvittering`. */
  navigerTil: null;
};

/** Etter vellykket `verifyOtp` + `revokeOtherSessions`: vis kodene. Ikke kvittering ennå. */
export function etter2faKodeBekreftet(): { steg: 'koder' } {
  return { steg: 'koder' };
}

/** Etter at kodene er lastet ned/kopiert og bekreftet: vis kvittering. Ikke naviger. */
export function etter2faBekreftet(): Etter2faBekreftet {
  return { steg: 'ferdig', navigerTil: null };
}

export type KoderFullforInput = {
  lastetNed: boolean;
  kopiert: boolean;
  bekreftetLagret: boolean;
};

/**
 * Oppsettet er uferdig til kodene er tatt vare på.
 * Nedlasting eller kopiering, pluss en eksplisitt bekreftelse. En avkrysning
 * alene er det folk klikker seg forbi. En nedlasting uten bekreftelse er
 * like lett å glemme.
 */
export function kanFullforeKoder(input: KoderFullforInput): boolean {
  return (input.lastetNed || input.kopiert) && input.bekreftetLagret;
}

function erKodeListe(verdi: unknown): verdi is string[] {
  return Array.isArray(verdi) && verdi.every((k) => typeof k === 'string' && k.length > 0);
}

/** Plukker klartekst-kodene fra enable-svaret. Tom liste = vis dem ikke. */
export function plukkBackupKoder(svar: unknown): string[] {
  if (typeof svar !== 'object' || svar === null) return [];
  const rot = svar as Record<string, unknown>;
  if (erKodeListe(rot.backupCodes)) return rot.backupCodes;
  const data = rot.data;
  if (typeof data === 'object' && data !== null) {
    const indre = data as Record<string, unknown>;
    if (erKodeListe(indre.backupCodes)) return indre.backupCodes;
  }
  return [];
}

/**
 * F1-21 / CWE-640 — enable uten koder er et hull, ikke et hopp.
 * Better-Auth 1.6.x lager kodene i `/two-factor/enable`. Tomt svar betyr
 * at vi ikke kan vise dem én gang, og da skal oppsettet stoppe.
 */
export function krevBackupKoderEtterEnable(svar: unknown): string[] {
  return plukkBackupKoder(svar);
}

/** Norsk. Better-Auths `OTP has expired` skal aldri nå skjermen. */
export const OTP_UTLOPT_MELDING = 'Koden er utløpt. Be om en ny kode under.';
export const OTP_UGYLDIG_MELDING = 'Feil eller utløpt kode. Prøv igjen, eller be om en ny kode.';
export const OTP_COOKIE_UTLOPT_MELDING =
  'Innloggingen tok for lang tid. Be om en ny kode, eller start på nytt.';
export const GJENOPPRETTING_UGYLDIG_MELDING =
  'Ugyldig gjenopprettingskode. Hver kode kan brukes én gang.';
export const KODER_MANGLER_ETTER_ENABLE_MELDING =
  'Kunne ikke lage gjenopprettingskoder. Prøv igjen.';

export type ToFaktorVerifyUtfall =
  | { ok: true }
  | { ok: false; feil: string; knappeTilstand: 'error' };

function tekst(verdi: unknown): string {
  return typeof verdi === 'string' ? verdi : '';
}

function feilFelt(svar: unknown): { code: string; message: string } {
  if (svar instanceof Error) {
    const body =
      'body' in svar && typeof svar.body === 'object' && svar.body !== null
        ? (svar.body as { code?: unknown; message?: unknown })
        : null;
    return {
      code: tekst(body?.code),
      message: tekst(body?.message) || svar.message,
    };
  }
  if (typeof svar !== 'object' || svar === null) return { code: '', message: '' };
  const rot = svar as Record<string, unknown>;
  const error = rot.error;
  if (typeof error === 'object' && error !== null) {
    const felt = error as { code?: unknown; message?: unknown };
    return { code: tekst(felt.code), message: tekst(felt.message) };
  }
  if (typeof rot.code === 'string') {
    return { code: rot.code, message: tekst(rot.message) };
  }
  return { code: '', message: '' };
}

/**
 * Eneste utfall av verifyOtp / verifyBackupCode som UI-et får lov å stå i.
 * Utløpt, ugyldig, kastet feil eller «suksess» uten data → error + norsk tekst.
 * Aldri pending. Det var henge-bugen: `onVerify` lot `busy` bli stående på
 * loading når klienten kastet, eller kalte `finishSignIn` på et tomt svar.
 */
export function tolkToFaktorVerifySvar(svar: unknown): ToFaktorVerifyUtfall {
  const { code, message } = feilFelt(svar);
  const samlet = `${code} ${message}`.toLowerCase();

  if (code === 'OTP_HAS_EXPIRED' || /\bexpir/.test(samlet)) {
    return { ok: false, feil: OTP_UTLOPT_MELDING, knappeTilstand: 'error' };
  }
  if (code === 'INVALID_TWO_FACTOR_COOKIE' || samlet.includes('two factor cookie')) {
    return { ok: false, feil: OTP_COOKIE_UTLOPT_MELDING, knappeTilstand: 'error' };
  }
  if (code === 'INVALID_BACKUP_CODE' || samlet.includes('backup code')) {
    return { ok: false, feil: GJENOPPRETTING_UGYLDIG_MELDING, knappeTilstand: 'error' };
  }
  if (code || message) {
    return { ok: false, feil: OTP_UGYLDIG_MELDING, knappeTilstand: 'error' };
  }

  if (typeof svar !== 'object' || svar === null) {
    return { ok: false, feil: OTP_UGYLDIG_MELDING, knappeTilstand: 'error' };
  }
  const rot = svar as Record<string, unknown>;
  if ('data' in rot) {
    const data = rot.data;
    if (data == null || data === false) {
      return { ok: false, feil: OTP_UGYLDIG_MELDING, knappeTilstand: 'error' };
    }
    if (typeof data === 'object' && data !== null && 'status' in data) {
      if ((data as { status?: unknown }).status === false) {
        return { ok: false, feil: OTP_UGYLDIG_MELDING, knappeTilstand: 'error' };
      }
    }
    return { ok: true };
  }
  if (rot.status === true || rot.user != null || rot.session != null || rot.token != null) {
    return { ok: true };
  }
  return { ok: false, feil: OTP_UGYLDIG_MELDING, knappeTilstand: 'error' };
}

/**
 * Innloggingens «Bruk gjenopprettingskode» er en blindvei uten koder.
 * Ukjent / false / tomt → skjul. Bare eksplisitt true viser valget.
 */
export function visGjenopprettingsvalg(harUbrukte: boolean | null | undefined): boolean {
  return harUbrukte === true;
}

/**
 * Leser `two_factor.backup_codes` slik Better-Auth lagrer dem.
 * Klartekst-JSON med tom liste, eller tom streng = ingen ubrukte.
 * Kryptert blob (default i 1.6.30) telles som «har koder» så lenge den
 * ikke er den tomme lista — vi dekrypterer ikke i klienten.
 */
export function harUbrukteGjenopprettingskoder(lagret: string | null | undefined): boolean {
  if (lagret == null) return false;
  const trimmet = lagret.trim();
  if (!trimmet || trimmet === '[]' || trimmet === 'null' || trimmet === '{}') return false;
  try {
    const parsed: unknown = JSON.parse(trimmet);
    if (Array.isArray(parsed)) return parsed.length > 0;
    return false;
  } catch {
    return trimmet.length > 8;
  }
}

export function harUbrukteGjenopprettingskoderFraSvar(svar: unknown): boolean {
  if (typeof svar !== 'object' || svar === null) return false;
  const rot = svar as Record<string, unknown>;
  if (rot.harUbrukteGjenopprettingskoder === true) return true;
  const data = rot.data;
  if (typeof data === 'object' && data !== null) {
    return (data as Record<string, unknown>).harUbrukteGjenopprettingskoder === true;
  }
  return false;
}

export const KODER_FILNAVN = 'endwise-gjenopprettingskoder.txt';

export function koderSomTekstfil(koder: readonly string[]): string {
  return [
    'Endwise — gjenopprettingskoder',
    '',
    'Hver kode kan brukes én gang hvis du mister tilgangen til e-posten.',
    'Oppbevar dem utenfor denne maskinen.',
    '',
    ...koder,
    '',
  ].join('\n');
}

export type SlaaAv2faOk = {
  ok: true;
  passord: string;
};

export type SlaaAv2faFeil = {
  ok: false;
  feil: string;
};

/** Klientvalidering. Sperren er serverhooken som nekter tomt passord. */
export function validerSlaaAv2fa(passord: string): SlaaAv2faOk | SlaaAv2faFeil {
  const trimmet = passord.trim();
  if (!trimmet) {
    return { ok: false, feil: 'Skriv det gjeldende passordet før du slår av tofaktor.' };
  }
  return { ok: true, passord: trimmet };
}

/**
 * Payloaden til Better-Auth `disable`. Bare passord — ingen klientflagg
 * som «passwordRequired» eller «skip». Serveren stoler ikke på dem.
 */
export function slaaAv2faKall(ok: { passord: string }): { password: string } {
  return { password: ok.passord };
}

/** `audit_log.action` når 2FA slås av. Ingen hemmeligheter i metadata. */
export const TO_FAKTOR_DISABLE_AUDIT_ACTION = 'two_factor.disabled';

/** Hard navigasjon — samme lærdom som dobbel-login-bugen på `/signin`. */
export function fortsettEtter2faKvittering(landing?: string | null): { destinasjon: string } {
  if (landing?.startsWith('/') && !landing.startsWith('//')) {
    return { destinasjon: landing };
  }
  return { destinasjon: '/dashboard' };
}

/**
 * Statusraden i Settings › Profil og mekanikerens «Meg».
 * Leser `session.user.twoFactorEnabled`. Udefinert felt = vi vet ikke ennå
 * (sesjonen laster), ikke «av».
 */
export function toFaktorStatusTekst(enabled: boolean | undefined): string {
  if (enabled === undefined) return '—';
  return enabled ? 'På — engangskode på e-post' : 'Av';
}

/** Lenken på statusraden. F1-21/F1-22 eier slå-av og gjenopprettingskoder. */
export const TO_FAKTOR_OPPSETT_STI = '/2fa-oppsett';
