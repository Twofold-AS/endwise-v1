/**
 * Tjenester — bookbare tjenester. Samme Innstillinger-chrome.
 */

export const TJENESTER_FANE_IDS = ['alle', 'opprett'] as const;

export type TjenesterFaneId = (typeof TJENESTER_FANE_IDS)[number];

export type TjenesterFaneDef = {
  id: TjenesterFaneId;
  label: string;
  ingress: string;
};

export const TJENESTER_FANER: readonly TjenesterFaneDef[] = [
  {
    id: 'alle',
    label: 'Alle tjenester',
    ingress: 'Tjenestene kunden kan bestille hos dere.',
  },
  {
    id: 'opprett',
    label: 'Opprett tjenester',
    ingress: 'Ny tjeneste i katalogen.',
  },
];

const SETT = new Set<string>(TJENESTER_FANE_IDS);

export function erTjenesterFaneId(v: string | null | undefined): v is TjenesterFaneId {
  return typeof v === 'string' && SETT.has(v);
}

export function erTjenesterSti(pathname: string): boolean {
  return (
    pathname === '/prisliste' ||
    pathname.startsWith('/prisliste/') ||
    pathname === '/innstillinger/tjenestekatalog' ||
    pathname.startsWith('/innstillinger/tjenestekatalog/')
  );
}

export function parseTjenesterFane(raw: string | null | undefined): TjenesterFaneId {
  if (raw === 'ny' || raw === 'opprett') return 'opprett';
  return erTjenesterFaneId(raw) ? raw : 'alle';
}

export function tjenesterHref(fane: TjenesterFaneId): string {
  return fane === 'alle' ? '/prisliste' : '/prisliste?fane=opprett';
}
