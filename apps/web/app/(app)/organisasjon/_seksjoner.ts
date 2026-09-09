export const ORG_SEKSJON_IDS = ['oversikt', 'ansatte', 'abonnement', 'integrasjoner'] as const;

export type OrgSeksjon = (typeof ORG_SEKSJON_IDS)[number];

/** Top-bar 2 — bunnknappene på Org-landing flyttet hit. Timeplan er destinasjon. */
export const ORG_CHROME_IDS = [
  'oversikt',
  'ansatte',
  'timeplan',
  'abonnement',
  'integrasjoner',
] as const;

export type OrgChromeId = (typeof ORG_CHROME_IDS)[number];

export type OrgChromeFane = {
  id: OrgChromeId;
  label: string;
  href: string;
  ingress?: string;
  admin?: boolean;
};

export const ORG_CHROME_FANER: readonly OrgChromeFane[] = [
  {
    id: 'oversikt',
    label: 'Oversikt',
    href: '/organisasjon',
    ingress: 'Navn, org.nr og kontakt som vises i appen.',
  },
  {
    id: 'ansatte',
    label: 'Ansatte',
    href: '/organisasjon?seksjon=ansatte',
    ingress: 'Teamet på verkstedet.',
  },
  { id: 'timeplan', label: 'Timeplan', href: '/jobber', ingress: 'Kapasitet og kalender.' },
  {
    id: 'abonnement',
    label: 'Abonnement',
    href: '/organisasjon?seksjon=abonnement',
    ingress: 'Plan og tjenester.',
    admin: true,
  },
  {
    id: 'integrasjoner',
    label: 'Integrasjoner',
    href: '/organisasjon?seksjon=integrasjoner',
    ingress: 'Koblinger mot Quick og andre systemer.',
    admin: true,
  },
];

const SETT = new Set<string>(ORG_SEKSJON_IDS);

const ADMIN_SEKSJONER = new Set<OrgSeksjon>(['abonnement', 'integrasjoner']);

export function parseOrgSeksjon(raw: string | null | undefined, isAdmin: boolean): OrgSeksjon {
  if (!raw || !SETT.has(raw)) return 'oversikt';
  const id = raw as OrgSeksjon;
  if (ADMIN_SEKSJONER.has(id) && !isAdmin) return 'oversikt';
  return id;
}

export function organisasjonHref(seksjon: OrgSeksjon): string {
  return seksjon === 'oversikt' ? '/organisasjon' : `/organisasjon?seksjon=${seksjon}`;
}

export function synligeOrgChrome(isAdmin: boolean): OrgChromeFane[] {
  return ORG_CHROME_FANER.filter((f) => !f.admin || isAdmin);
}

export function parseOrgChrome(
  pathname: string,
  raw: string | null | undefined,
  isAdmin: boolean,
): OrgChromeId {
  if (pathname === '/jobber' || pathname.startsWith('/jobber/')) return 'timeplan';
  const seksjon = parseOrgSeksjon(raw, isAdmin);
  return seksjon;
}

export function erOrganisasjonChromeSti(pathname: string): boolean {
  return (
    pathname === '/organisasjon' ||
    pathname.startsWith('/organisasjon/') ||
    pathname === '/ansatte' ||
    pathname === '/forhandleren' ||
    pathname === '/abonnement' ||
    pathname.startsWith('/abonnement/') ||
    pathname === '/integrasjoner' ||
    pathname.startsWith('/integrasjoner/')
  );
}
