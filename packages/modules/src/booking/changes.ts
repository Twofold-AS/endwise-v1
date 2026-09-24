/**
 * F7-05 / BIT 3 — avvik og forespørsler bor i booking.notes.
 * Mekaniker skriver `[AVVIK ` via mechanic.reportDeviation.
 * Desk skriver `[FORESPOR ` / `[AVVIK ` via bookings.reportChange.
 * Behandling skriver om prefikset til `-BEHANDLET`, så ventende-telleren faller.
 */

export const AVVIK_NOTAT_PREFIKS = '[AVVIK ';
export const FORESPOR_NOTAT_PREFIKS = '[FORESPOR ';
export const AVVIK_BEHANDLET_PREFIKS = '[AVVIK-BEHANDLET ';
export const FORESPOR_BEHANDLET_PREFIKS = '[FORESPOR-BEHANDLET ';

export type EndringKind = 'avvik' | 'forespor';
export type EndringDecision = 'godkjent' | 'avslatt';

export function endringPrefiks(kind: EndringKind): string {
  return kind === 'forespor' ? FORESPOR_NOTAT_PREFIKS : AVVIK_NOTAT_PREFIKS;
}

export function endringBehandletPrefiks(kind: EndringKind): string {
  return kind === 'forespor' ? FORESPOR_BEHANDLET_PREFIKS : AVVIK_BEHANDLET_PREFIKS;
}

export function harVentendeAvvik(notes: string | null | undefined): boolean {
  return Boolean(notes?.includes(AVVIK_NOTAT_PREFIKS));
}

export function harVentendeForespor(notes: string | null | undefined): boolean {
  return Boolean(notes?.includes(FORESPOR_NOTAT_PREFIKS));
}

export function harBehandletEndring(notes: string | null | undefined): boolean {
  return Boolean(
    notes?.includes(AVVIK_BEHANDLET_PREFIKS) || notes?.includes(FORESPOR_BEHANDLET_PREFIKS),
  );
}

export function harVentendeEndring(notes: string | null | undefined, kind?: EndringKind): boolean {
  if (!notes) return false;
  if (kind === 'forespor') return harVentendeForespor(notes);
  if (kind === 'avvik') return harVentendeAvvik(notes);
  return harVentendeAvvik(notes) || harVentendeForespor(notes);
}

export function byggEndringLinje(
  kind: EndringKind,
  message: string,
  naa: Date = new Date(),
): string {
  const tekst = message.trim();
  return `${endringPrefiks(kind)}${naa.toLocaleString('nb-NO')}] ${tekst}`;
}

export function appendEndringNotat(
  notes: string | null | undefined,
  kind: EndringKind,
  message: string,
  naa: Date = new Date(),
): string {
  const linje = byggEndringLinje(kind, message, naa);
  return notes ? `${notes}\n${linje}` : linje;
}

/**
 * Skriver ventende `[AVVIK `/`[FORESPOR `-linjer om til behandlet.
 * Originalteksten etter `]` beholdes.
 */
export function markerEndringBehandlet(
  notes: string,
  kind: EndringKind,
  decision: EndringDecision,
  naa: Date = new Date(),
): string {
  const pending = endringPrefiks(kind);
  const done = endringBehandletPrefiks(kind);
  const stamp = naa.toLocaleString('nb-NO');
  return notes
    .split('\n')
    .map((line) => {
      const idx = line.indexOf(pending);
      if (idx < 0) return line;
      const close = line.indexOf(']', idx);
      const rest = close >= 0 ? line.slice(close + 1) : line.slice(idx + pending.length);
      return `${line.slice(0, idx)}${done}${decision} ${stamp}]${rest}`;
    })
    .join('\n');
}

export function utdragEndring(notes: string | null | undefined, kind: EndringKind): string {
  if (!notes) return kind === 'forespor' ? 'Forespørsel uten tekst.' : 'Avvik uten tekst.';
  const pending = endringPrefiks(kind).trim();
  const treated = endringBehandletPrefiks(kind).trim();
  const linjer = notes
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.includes(pending) || l.includes(treated));
  return linjer.join('\n') || notes;
}

export function endringKindFraNotat(notes: string | null | undefined): EndringKind {
  if (harVentendeForespor(notes) || notes?.includes(FORESPOR_BEHANDLET_PREFIKS)) return 'forespor';
  return 'avvik';
}
