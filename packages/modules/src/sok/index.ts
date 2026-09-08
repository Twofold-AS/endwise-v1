/**
 * Globalt søk — gruppering og nøkler.
 * Selve oppslaget bor i tRPC (`search.global`) mot eksisterende tabeller.
 * Tom gruppe = skjult. Kort spørring = ingen kall.
 */

export const SOK_MIN = 2;
export const SOK_LIMIT = 8;

export const SOK_KATEGORIER = [
  'Kunde',
  'Jobber',
  'Innboks',
  'Kjøretøy',
  'Deler',
  'Team',
  'Tjenester',
  'Hjelp',
  'Sider',
] as const;

export type SokKategori = (typeof SOK_KATEGORIER)[number];

export type SokTreff = {
  id: string;
  tittel: string;
  under: string | null;
  href: string;
};

export type SokGruppe = {
  kategori: SokKategori;
  treff: SokTreff[];
};

export function normaliserSok(q: string): string | null {
  const t = q.trim();
  return t.length >= SOK_MIN ? t : null;
}

export function treffInneholder(hay: string | null | undefined, q: string): boolean {
  if (!hay) return false;
  return hay.toLocaleLowerCase('nb-NO').includes(q.toLocaleLowerCase('nb-NO'));
}

export function filtrerTommeGrupper(grupper: SokGruppe[]): SokGruppe[] {
  return grupper.filter((g) => g.treff.length > 0);
}

export function grupperSider(
  dest: ReadonlyArray<{ key: string; label: string; href: string }>,
  q: string,
): SokGruppe | null {
  const treff = dest
    .filter((d) => treffInneholder(d.label, q))
    .slice(0, SOK_LIMIT)
    .map((d) => ({
      id: d.key,
      tittel: d.label,
      under: null,
      href: d.href,
    }));
  if (treff.length === 0) return null;
  return { kategori: 'Sider', treff };
}
