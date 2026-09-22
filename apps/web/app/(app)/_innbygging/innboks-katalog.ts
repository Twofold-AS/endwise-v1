/**
 * Claude Innboks-katalog: søk · filter · sort · pager · trash+angre.
 * Tråder kommer allerede filtrert på deltakelse fra `messages.listThreads`.
 */

export const INNBOKS_SIDE_STORRELSE = 10;
export const INNBOKS_ANGRE_NOKKEL = 'endwise.innboks.angre';

export type InnboksTradRad = {
  id: string;
  kind: string;
  subject?: string | null;
  unread?: number;
  lastMessageAt?: Date | string;
  motparter?: readonly string[];
  heading?: string;
};

export function innboksTrefferSok(rad: InnboksTradRad, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [rad.heading ?? '', rad.subject ?? '', ...(rad.motparter ?? [])]
    .join(' ')
    .toLowerCase();
  return hay.includes(needle);
}

export function innboksPagerTekst(offset: number, vist: number, total: number): string {
  if (total === 0 || vist === 0) return 'Viser 0–0 av 0';
  return `Viser ${offset + 1}–${offset + vist} av ${total}`;
}

export function innboksAngreTekst(antall: number): string {
  return antall === 1 ? '1 samtale er slettet' : `${antall} samtaler er slettet`;
}
