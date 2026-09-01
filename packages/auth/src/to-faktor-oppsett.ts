/**
 * TOTP-app som andre faktor. Magic link beviser innboks.
 * Ingen passord, ingen e-postkode.
 */

export type ToFaktorSteg = 'app' | 'kode' | 'koder' | 'av' | 'ferdig';

export type Etter2faBekreftet = {
  steg: 'ferdig';
  navigerTil: null;
};

export function etter2faKodeBekreftet(): { steg: 'koder' } {
  return { steg: 'koder' };
}

export function etter2faBekreftet(): Etter2faBekreftet {
  return { steg: 'ferdig', navigerTil: null };
}

export type KoderFullforInput = {
  lastetNed: boolean;
  kopiert: boolean;
  bekreftetLagret: boolean;
};

export function kanFullforeKoder(input: KoderFullforInput): boolean {
  return (input.lastetNed || input.kopiert) && input.bekreftetLagret;
}

function erKodeListe(verdi: unknown): verdi is string[] {
  return Array.isArray(verdi) && verdi.every((k) => typeof k === 'string' && k.length > 0);
}

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

export function plukkTotpUri(svar: unknown): string | null {
  if (typeof svar !== 'object' || svar === null) return null;
  const rot = svar as Record<string, unknown>;
  if (typeof rot.totpURI === 'string' && rot.totpURI.length > 0) return rot.totpURI;
  const data = rot.data;
  if (typeof data === 'object' && data !== null) {
    const uri = (data as Record<string, unknown>).totpURI;
    if (typeof uri === 'string' && uri.length > 0) return uri;
  }
  return null;
}

export function secretFraTotpUri(uri: string): string | null {
  try {
    return new URL(uri).searchParams.get('secret');
  } catch {
    const m = /[?&]secret=([^&]+)/.exec(uri);
    return m?.[1] ? decodeURIComponent(m[1]) : null;
  }
}

export const KODER_FILNAVN = 'endwise-gjenopprettingskoder.txt';

export function koderSomTekstfil(koder: readonly string[]): string {
  return [
    'Endwise — gjenopprettingskoder',
    '',
    'Hver kode kan brukes én gang hvis du mister autentikator-appen.',
    'Oppbevar dem utenfor denne maskinen — ikke i samme innboks som magic link.',
    '',
    ...koder,
    '',
  ].join('\n');
}

export const TO_FAKTOR_DISABLE_AUDIT_ACTION = 'two_factor.disabled';

export function fortsettEtter2faKvittering(landing?: string | null): { destinasjon: string } {
  if (landing?.startsWith('/') && !landing.startsWith('//')) {
    return { destinasjon: landing };
  }
  return { destinasjon: '/dashboard' };
}

export function toFaktorStatusTekst(enabled: boolean | undefined): string {
  if (enabled === undefined) return '—';
  return enabled ? 'På — autentikator-app' : 'Av';
}

export const TO_FAKTOR_OPPSETT_STI = '/2fa-oppsett';
