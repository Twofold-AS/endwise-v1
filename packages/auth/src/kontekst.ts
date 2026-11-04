/**
 * F26 / white label F7 — Privat/Bedrift.
 * Kontekst bor på sesjonsraden, ikke i cookien. Bedrift krever passnøkkel.
 * Utløpt vindu faller til Privat, ikke ut.
 */

export const KONTEKST = ['privat', 'bedrift'] as const;
export type SesjonKontekst = (typeof KONTEKST)[number];

export const BEDRIFT_IDLE_SECONDS = 30 * 60;
export const BEDRIFT_ABSOLUTE_SECONDS = 10 * 60 * 60;
export const BEDRIFT_CSRF_HEADER = 'x-endwise-csrf';
export const BEDRIFT_CSRF_VERDI = '1';
export const KONTEKST_AUDIT = 'session.context_switch';

export function erKontekst(v: string | null | undefined): v is SesjonKontekst {
  return v === 'privat' || v === 'bedrift';
}

export function erBedriftVinduAktiv(input: {
  kontekst?: string | null;
  verifisertAt?: Date | string | null;
  utloperAt?: Date | string | null;
  now?: Date;
}): boolean {
  if (input.kontekst !== 'bedrift') return false;
  const now = input.now ?? new Date();
  if (!input.verifisertAt || !input.utloperAt) return false;
  const verifisert = new Date(input.verifisertAt);
  const utloper = new Date(input.utloperAt);
  if (now >= utloper) return false;
  if (now.getTime() - verifisert.getTime() >= BEDRIFT_ABSOLUTE_SECONDS * 1000) return false;
  return true;
}

export function bedriftUtloperAt(now: Date = new Date(), verifisertAt: Date = now): Date {
  const idle = new Date(now.getTime() + BEDRIFT_IDLE_SECONDS * 1000);
  const abs = new Date(verifisertAt.getTime() + BEDRIFT_ABSOLUTE_SECONDS * 1000);
  return idle < abs ? idle : abs;
}

/** Ingen rolle → kundeside. Rolle → valg. Bedrift bare med vindu. */
export function landingEtterKode(input: {
  harRolle: boolean;
  totpBundet?: boolean;
  harPasskey?: boolean;
  whiteLabel: boolean;
  sone?: 'forhandler' | 'platform' | 'app' | null;
}): '/min-side' | '/2fa-oppsett' | '/home' | '/' {
  const bundet = input.harPasskey === true;
  if (!input.whiteLabel) return '/';
  if (input.sone === 'app') {
    if (!input.harRolle) return '/';
    if (!bundet) return '/2fa-oppsett';
    return '/home';
  }
  if (!input.harRolle) return '/min-side';
  if (input.sone === 'forhandler') return '/min-side';
  if (!bundet) return '/2fa-oppsett';
  return '/home';
}

export function kanAapneBedrift(input: {
  harRolle: boolean;
  totpBundet?: boolean;
  harPasskey?: boolean;
}): boolean {
  return input.harRolle && input.harPasskey === true;
}

export function harBedriftCsrf(headers: Headers | null | undefined): boolean {
  return headers?.get(BEDRIFT_CSRF_HEADER)?.trim() === BEDRIFT_CSRF_VERDI;
}

/** __Host- krever Secure, Path=/, ingen Domain. */
export function forhandlerCookieAttributter(prod: boolean): {
  httpOnly: true;
  sameSite: 'lax';
  secure: boolean;
  path: '/';
  prefix: '__Host-' | '__Secure-' | '';
} {
  if (!prod) {
    return { httpOnly: true, sameSite: 'lax', secure: false, path: '/', prefix: '' };
  }
  return { httpOnly: true, sameSite: 'lax', secure: true, path: '/', prefix: '__Host-' };
}

export function byggSesjonKake(input: {
  token: string;
  prod: boolean;
  maxAgeSekunder: number;
  prefixNavn?: string;
}): string {
  const attr = forhandlerCookieAttributter(input.prod);
  const pre = attr.prefix;
  const navn = `${pre}${input.prefixNavn ?? 'endwise'}.session_token`;
  const deler = [
    `${navn}=${input.token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${input.maxAgeSekunder}`,
  ];
  if (attr.secure) deler.push('Secure');
  return deler.join('; ');
}

export function byggDealerCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://va.vercel-scripts.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
    "worker-src 'self' blob:",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}
