/**
 * Timeplan — samme Innstillinger-chrome (midtstilt tittel + underline-faner).
 * Endringer er destinasjonen som lister Avvik og Forespørsler.
 */

export const TIMEPLAN_FANE_IDS = ['timeplan', 'opprett', 'endringer'] as const;

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
    id: 'endringer',
    label: 'Endringer',
    ingress: 'Avvik og forespørsler på jobben.',
  },
];

export const ENDRINGER_DEL_IDS = ['avvik', 'forespor'] as const;

export type EndringerDelId = (typeof ENDRINGER_DEL_IDS)[number];

export type EndringerDelDef = {
  id: EndringerDelId;
  label: string;
  ingress: string;
};

export const ENDRINGER_DELER: readonly EndringerDelDef[] = [
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
  if (pathname === '/avvik' || pathname.startsWith('/avvik/')) return 'endringer';
  if (pathname === '/timeplan/endringer' || pathname.startsWith('/timeplan/endringer/')) {
    return 'endringer';
  }
  if (raw === 'foresporsler' || raw === 'forespørsler' || raw === 'forespor') return 'endringer';
  if (raw === 'avvik' || raw === 'endringer') return 'endringer';
  return erTimeplanFaneId(raw) ? raw : 'timeplan';
}

export function parseEndringerDel(
  pathname: string,
  raw: string | null | undefined,
): EndringerDelId {
  if (pathname === '/avvik' || pathname.startsWith('/avvik/')) return 'avvik';
  if (raw === 'foresporsler' || raw === 'forespørsler' || raw === 'forespor') return 'forespor';
  if (raw === 'avvik') return 'avvik';
  return 'avvik';
}

export function timeplanHref(fane: TimeplanFaneId): string {
  if (fane === 'timeplan') return '/jobber';
  if (fane === 'opprett') return '/bookinger/ny';
  return '/jobber?fane=endringer';
}

export function endringerHref(del: EndringerDelId): string {
  return del === 'avvik' ? '/jobber?fane=avvik' : '/jobber?fane=forespor';
}

/** Hjem-kortet: Avvik-listen på Timeplan › Endringer › Avvik. */
export const TIMEPLAN_AVVIK_HREF = endringerHref('avvik');
/** Hjem-kortet: Forespørsler på Timeplan › Endringer › Forespørsler. */
export const TIMEPLAN_FORESPOR_HREF = endringerHref('forespor');
export const TIMEPLAN_ENDRINGER_HREF = timeplanHref('endringer');
