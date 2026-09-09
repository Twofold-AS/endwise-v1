/**
 * Kunder — samme Innstillinger-chrome (midtstilt tittel + underline-faner).
 */

export const KUNDER_FANE_IDS = ['alle', 'opprett', 'kjoretoy'] as const;

export type KunderFaneId = (typeof KUNDER_FANE_IDS)[number];

export type KunderFaneDef = {
  id: KunderFaneId;
  label: string;
  ingress: string;
};

export const KUNDER_FANER: readonly KunderFaneDef[] = [
  {
    id: 'alle',
    label: 'Alle kunder',
    ingress: 'Søk, historikk og endring av kontakt og kjøretøy.',
  },
  {
    id: 'opprett',
    label: 'Opprett kunde',
    ingress: 'Ny kunde i registeret.',
  },
  {
    id: 'kjoretoy',
    label: 'Registrer kjøretøy',
    ingress: 'Knytt et kjøretøy til en kunde.',
  },
];

const SETT = new Set<string>(KUNDER_FANE_IDS);

export function erKunderFaneId(v: string | null | undefined): v is KunderFaneId {
  return typeof v === 'string' && SETT.has(v);
}

export function erKunderSti(pathname: string): boolean {
  return (
    pathname === '/kunder' ||
    pathname.startsWith('/kunder/') ||
    pathname === '/kjoretoy' ||
    pathname.startsWith('/kjoretoy/')
  );
}

export function parseKunderFane(
  pathname: string,
  raw: string | null | undefined,
  ny?: string | null,
): KunderFaneId {
  if (pathname === '/kjoretoy' || pathname.startsWith('/kjoretoy/')) return 'kjoretoy';
  if (ny === '1' || raw === 'ny') return 'opprett';
  return erKunderFaneId(raw) ? raw : 'alle';
}

export function kunderHref(fane: KunderFaneId): string {
  if (fane === 'alle') return '/kunder';
  if (fane === 'opprett') return '/kunder?fane=opprett';
  return '/kunder?fane=kjoretoy';
}
