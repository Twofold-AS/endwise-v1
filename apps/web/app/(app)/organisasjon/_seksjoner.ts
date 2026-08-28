export const ORG_SEKSJON_IDS = [
  'oversikt',
  'timeplan',
  'ansatte',
  'abonnement',
  'integrasjoner',
] as const;

export type OrgSeksjon = (typeof ORG_SEKSJON_IDS)[number];

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
