/** Claude Ansatte-rad: På jobb / Av vakt når status finnes. */

export type AnsattVakt = 'På jobb' | 'Av vakt';

export function ansattVaktLabel(status: string | null | undefined): AnsattVakt {
  return status === 'på_jobb' || status === 'opptatt' ? 'På jobb' : 'Av vakt';
}

export function ansattInitialer(navn: string): string {
  const deler = navn.trim().split(/\s+/).filter(Boolean);
  if (deler.length === 0) return '#';
  const forste = deler[0] ?? '';
  if (deler.length === 1) return forste.slice(0, 2).toLocaleUpperCase('nb-NO');
  const andre = deler[1] ?? '';
  return `${forste.slice(0, 1)}${andre.slice(0, 1)}`.toLocaleUpperCase('nb-NO');
}
