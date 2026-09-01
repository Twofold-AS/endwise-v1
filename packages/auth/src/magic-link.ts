/**
 * Magic link-innlogging (erstatter passord).
 * Lenka og den manuelle koden er SAMME engangsbevis for innboks.
 * Andre faktor etter enrollment er TOTP-app — ikke e-postkode.
 */

export const MAGIC_LINK_TTL_SEKUNDER = 600;
export const MAGIC_LINK_BE_OM_STI = '/sign-in/magic-link';
export const SIGN_OUT_STI = '/sign-out';
export const MAGIC_LINK_VERIFY_STI = '/magic-link/verify';
export const MAGIC_LINK_VERIFY_URL = `/api/auth${MAGIC_LINK_VERIFY_STI}`;
export const MAGIC_LINK_CALLBACK = '/signin';
export const MAGIC_LINK_TOTP_QUERY = 'steg=totp';
export const MAGIC_LINK_ENROLL_STI = '/2fa-oppsett';

/** Samme tak som gammel e-post-innlogging: 5 per minutt per IP. */
export const MAGIC_LINK_BE_OM_GRENSE = { window: 60, max: 5 } as const;
export const MAGIC_LINK_VERIFY_GRENSE = { window: 60, max: 5 } as const;

/** Typebar kode (lenka bærer den samme). Ingen 0/O/1/I. */
export const MAGIC_LINK_KODE_ALFABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const MAGIC_LINK_KODE_LENGDE = 12;

export const MAGIC_LINK_ERSTATTET_MELDING =
  'Lenken er utløpt eller erstattet. Åpne den nyeste e-posten fra Endwise.';

export const MAGIC_LINK_ENROLL_UTEN_SESJON =
  'Be om en ny innloggingslenke med Fortsett. Den forrige er brukt. Deretter binder du appen.';

export function genererMagicLinkKode(): string {
  const bytes = new Uint8Array(MAGIC_LINK_KODE_LENGDE);
  crypto.getRandomValues(bytes);
  let ut = '';
  for (const b of bytes) {
    ut += MAGIC_LINK_KODE_ALFABET[b % MAGIC_LINK_KODE_ALFABET.length];
  }
  return ut;
}

export function normaliserMagicLinkKode(input: string): string {
  return input.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

export function visMagicLinkKode(kode: string): string {
  const n = normaliserMagicLinkKode(kode);
  return n.match(/.{1,4}/g)?.join('-') ?? n;
}

export function magicLinkVerifySti(token: string): string {
  const kode = normaliserMagicLinkKode(token);
  const dest = new URL(MAGIC_LINK_VERIFY_URL, 'http://endwise.local');
  dest.searchParams.set('token', kode);
  dest.searchParams.set('callbackURL', MAGIC_LINK_CALLBACK);
  dest.searchParams.set('errorCallbackURL', MAGIC_LINK_CALLBACK);
  return `${dest.pathname}${dest.search}`;
}

export function meldingForMagicLinkFeil(error: string | null | undefined): string | null {
  if (!error) return null;
  return MAGIC_LINK_ERSTATTET_MELDING;
}

export function erMagicLinkVerificationRad(identifier: string, value: string): boolean {
  if (identifier.startsWith('reset-password:')) return false;
  if (identifier.startsWith('2fa-')) return false;
  try {
    const parsed = JSON.parse(value) as { email?: unknown };
    return typeof parsed.email === 'string' && parsed.email.includes('@');
  } catch {
    return false;
  }
}

export function erMagicLinkForEpost(value: string, epost: string): boolean {
  try {
    const parsed = JSON.parse(value) as { email?: unknown };
    return (
      typeof parsed.email === 'string' && parsed.email.toLowerCase() === epost.trim().toLowerCase()
    );
  } catch {
    return false;
  }
}
