/**
 * F1-20 / F1-21 / F1-22 / F1-23 — 2FA-status, gjenopprettingskoder,
 * slå-av og kvittering etter påslag.
 *
 * ── F1-23: hvorfor navigasjonen er SKILT fra «ferdig» ─────────────────────
 * `/2fa-oppsett` satte `steg = 'ferdig'` og kalte `window.location.assign`
 * i samme blokk. Tilstanden rakk aldri å rendre — brukeren så aldri at det
 * gikk bra. Derfor returnerer `etter2faBekreftet()` KUN «vis kvittering».
 * Navigasjon skjer først når brukeren trykker Fortsett.
 *
 * ── F1-21: kodene kommer fra `enable`, ikke fra et eget kall ──────────────
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
 * F1-21 — oppsettet er uferdig til kodene er tatt vare på.
 *
 * Nedlasting ELLER kopiering, pluss en eksplisitt bekreftelse. En avkrysning
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
 * F1-20 — statusraden i Settings › Profil og mekanikerens «Meg».
 *
 * Leser `session.user.twoFactorEnabled`. Udefinert felt = vi vet ikke ennå
 * (sesjonen laster), ikke «av».
 */
export function toFaktorStatusTekst(enabled: boolean | undefined): string {
  if (enabled === undefined) return '—';
  return enabled ? 'På — engangskode på e-post' : 'Av';
}

/** Lenken på statusraden. F1-21/F1-22 eier slå-av og gjenopprettingskoder. */
export const TO_FAKTOR_OPPSETT_STI = '/2fa-oppsett';
