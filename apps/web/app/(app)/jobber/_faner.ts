/**
 * Timeplan — samme Innstillinger-chrome (midtstilt tittel + underline-faner).
 * Avvik og Forespørsler fra hjem-kortet lander her.
 */

export const TIMEPLAN_FANE_IDS = ['timeplan', 'opprett', 'avvik', 'forespor'] as const;

export type TimeplanFaneId = (typeof TIMEPLAN_FANE_IDS)[number];

export type TimeplanFaneDef = {
  id: TimeplanFaneId;
  label: string;
  ingress: string;
};

export const TIMEPLAN_FANER: readonly TimeplanFaneDef[] = [
  {
    id: 'timeplan',
    label: 'Timeplan',
    ingress: 'Kapasitet og kalender for verkstedet.',
  },
  {
    id: 'opprett',
    label: 'Opprett jobb',
    ingress: 'Ny jobb mot ledig slot.',
  },
  {
    id: 'avvik',
    label: 'Avvik',
    ingress: 'Avvik mekanikere logger på jobben.',
  },
  {
    id: 'forespor',
    label: 'Forespørsler',
    ingress: 'Forespørsler om tid og endring på jobben.',
  },
];

const SETT = new Set<string>(TIMEPLAN_FANE_IDS);

export function erTimeplanFaneId(v: string | null | undefined): v is TimeplanFaneId {
  return typeof v === 'string' && SETT.has(v);
}

export function erTimeplanSti(pathname: string): boolean {
  return (
    pathname === '/jobber' ||
    pathname.startsWith('/jobber/') ||
    pathname === '/saker' ||
    pathname.startsWith('/saker/') ||
    pathname === '/bookinger/ny' ||
    pathname === '/avvik' ||
    pathname.startsWith('/avvik/') ||
    pathname === '/timeplan' ||
    pathname.startsWith('/timeplan/')
  );
}

export function parseTimeplanFane(
  pathname: string,
  raw: string | null | undefined,
): TimeplanFaneId {
  if (pathname === '/bookinger/ny' || pathname.startsWith('/bookinger/ny/')) return 'opprett';
  if (pathname === '/avvik' || pathname.startsWith('/avvik/')) return 'avvik';
  if (pathname === '/timeplan/endringer' || pathname.startsWith('/timeplan/endringer/')) {
    return 'avvik';
  }
  if (raw === 'foresporsler' || raw === 'forespørsler' || raw === 'forespor') return 'forespor';
  if (raw === 'endringer') return 'avvik';
  return erTimeplanFaneId(raw) ? raw : 'timeplan';
}

export function timeplanHref(fane: TimeplanFaneId): string {
  if (fane === 'timeplan') return '/jobber';
  if (fane === 'opprett') return '/bookinger/ny';
  return `/jobber?fane=${fane}`;
}

/** Hjem-kortet: Avvik → Timeplan › Avvik. */
export const TIMEPLAN_AVVIK_HREF = timeplanHref('avvik');
/** Hjem-kortet: Forespørsler → Timeplan › Forespørsler. */
export const TIMEPLAN_FORESPOR_HREF = timeplanHref('forespor');
