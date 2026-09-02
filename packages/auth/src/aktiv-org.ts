export type AktivOrgKandidat = {
  id: string;
  slug: string | null;
  role: string;
};

/**
 * Etter magic-link: velg aktiv org før `session.me`.
 * Endwise-plattform (`slug=endwise` eller endwise-rolle) vinner over dealer.
 * Partner og dealer uten plattform-medlemskap får første medlemskap.
 */
export function velgAktivOrganisasjon(medlemskap: readonly AktivOrgKandidat[]): string | null {
  const plattform = medlemskap.find(
    (m) => m.slug === 'endwise' || m.role === 'endwise_admin' || m.role === 'endwise_support',
  );
  return plattform?.id ?? medlemskap[0]?.id ?? null;
}
