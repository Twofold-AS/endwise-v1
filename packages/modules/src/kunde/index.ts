/** F33 / white label F11b — kundeportal handling. */

export const JOBB_FASER = ['Mottatt', 'Under arbeid', 'Klar'] as const;
export type JobbFase = (typeof JOBB_FASER)[number];

export function jobbFase(status: string): { merkelapp: string; steg: number } {
  if (status === 'cancelled') return { merkelapp: 'Avlyst', steg: -1 };
  if (status === 'no_show') return { merkelapp: 'Ikke møtt', steg: -1 };
  if (status === 'completed') return { merkelapp: 'Klar', steg: 2 };
  if (status === 'in_progress') return { merkelapp: 'Under arbeid', steg: 1 };
  return { merkelapp: 'Mottatt', steg: 0 };
}

export {
  finnEllerOpprettKundetrad,
  IngenInnboksMottakerError,
  sendKundeMelding,
} from './melding.ts';
export { KUNDE_MELDING_MAKS, KUNDE_MELDING_PER_MINUTT, rensKundeMelding } from './tekst.ts';
