export type AktivOrgKandidat = {
  id: string;
  slug: string | null;
  role: string;
};

/**
 * Etter magic-link: velg aktiv org før `session.me`.
 * Endwise-plattform (`slug=endwise` eller endwise-rolle) vinner over dealer.
 * Partner og dealer uten plattform-medlemskap får første medlemskap.
 * F5: på forhandler-sone ignoreres Endwise-medlemskap (ingen sesjon der).
 * På platform-sone velges bare Endwise-org.
 */
export function velgAktivOrganisasjon(
  medlemskap: readonly AktivOrgKandidat[],
  sone?: 'forhandler' | 'platform' | null,
): string | null {
  if (sone === 'platform') {
    const plattform = medlemskap.find(
      (m) => m.slug === 'endwise' || m.role === 'endwise_admin' || m.role === 'endwise_support',
    );
    return plattform?.id ?? null;
  }
  if (sone === 'forhandler') {
    const dealer = medlemskap.find(
      (m) => m.role !== 'endwise_admin' && m.role !== 'endwise_support',
    );
    return dealer?.id ?? null;
  }
  const plattform = medlemskap.find(
    (m) => m.slug === 'endwise' || m.role === 'endwise_admin' || m.role === 'endwise_support',
  );
  return plattform?.id ?? medlemskap[0]?.id ?? null;
}
