/**
 * F3-12 — nivåordene UI-et skal vise. Speiler `SKILL_LEVELS` i
 * `packages/db/src/schema/competence.ts`. Tall alene er for matcheren;
 * forhandleren skal lese «Selvstendig», ikke «3».
 */
export const NIVA: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Under opplæring',
  2: 'Trenger veiledning',
  3: 'Selvstendig',
  4: 'Erfaren',
  5: 'Spesialist',
};

export const NIVA_VALG = (Object.entries(NIVA) as [string, string][]).map(([niva, label]) => ({
  niva: Number(niva) as 1 | 2 | 3 | 4 | 5,
  label,
}));

export function nivaTekst(niva: number): string {
  return NIVA[niva as 1 | 2 | 3 | 4 | 5] ?? `nivå ${niva}`;
}

/** Samme 60-dagers varsel som EU-frist og mekanikerens egen Kompetanse-side. */
export function sertStatus(expiresAt: string | Date | null | undefined): {
  tone: string;
  tekst: string;
} | null {
  if (!expiresAt) return null;
  const exp = new Date(expiresAt);
  const dager = (exp.getTime() - Date.now()) / 86_400_000;
  const dato = exp.toLocaleDateString('nb-NO');
  if (dager < 0) return { tone: 'text-danger', tekst: `sert. utløpt ${dato}` };
  if (dager < 60) return { tone: 'text-warn', tekst: `sert. t.o.m. ${dato}` };
  return { tone: 'text-fg-faint', tekst: `sert. t.o.m. ${dato}` };
}

export const FELT =
  'h-control rounded-control border border-border bg-bg px-2.5 text-body text-fg outline-none placeholder:text-fg-muted/60 focus-visible:border-fg';

/** Maskinnøkkel fra visningsnavn. `skills.key` er det matcheren og prislisten peker på. */
export function tilNokkel(navn: string): string {
  return navn
    .trim()
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}
