/** Claude Ansatte-rad: På jobb / Av vakt når status finnes. */

export type AnsattVakt = 'På jobb' | 'Av vakt';

export function ansattVaktLabel(status: string | null | undefined): AnsattVakt {
  return status === 'på_jobb' || status === 'opptatt' ? 'På jobb' : 'Av vakt';
}
