/**
 * F1-20 / F1-23 — 2FA-status og kvittering etter påslag.
 *
 * ── F1-23: hvorfor navigasjonen er SKILT fra «ferdig» ─────────────────────
 * `/2fa-oppsett` satte `steg = 'ferdig'` og kalte `window.location.assign`
 * i samme blokk. Tilstanden rakk aldri å rendre — brukeren så aldri at det
 * gikk bra. Derfor returnerer `etter2faBekreftet()` KUN «vis kvittering».
 * Navigasjon skjer først når brukeren trykker Fortsett.
 */

export type ToFaktorSteg = 'passord' | 'kode' | 'ferdig';

export type Etter2faBekreftet = {
  steg: 'ferdig';
  /** Alltid null. Navigasjon hører til `fortsettEtter2faKvittering`. */
  navigerTil: null;
};

/** Etter vellykket `verifyOtp` + `revokeOtherSessions`: vis kvittering. Ikke naviger. */
export function etter2faBekreftet(): Etter2faBekreftet {
  return { steg: 'ferdig', navigerTil: null };
}

/** Hard navigasjon — samme lærdom som dobbel-login-bugen på `/signin`. */
export function fortsettEtter2faKvittering(landing?: string | null): { destinasjon: string } {
  if (landing && landing.startsWith('/') && !landing.startsWith('//')) {
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
