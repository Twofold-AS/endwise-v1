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

/** Strukturert ønske i notatet — tid og/eller mekaniker. */
export type EndringOnske = {
  startsAt?: string;
  mechanicId?: string;
};

const ONSKE_START = '«ew:';
const ONSKE_SLUTT = '»';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function encodeEndringOnske(onske: EndringOnske): string {
  const payload: EndringOnske = {};
  if (onske.startsAt) payload.startsAt = onske.startsAt;
  if (onske.mechanicId) payload.mechanicId = onske.mechanicId;
  if (!payload.startsAt && !payload.mechanicId) return '';
  return `${ONSKE_START}${JSON.stringify(payload)}${ONSKE_SLUTT}`;
}

export function parseEndringOnskeTekst(tekst: string): EndringOnske | null {
  const start = tekst.lastIndexOf(ONSKE_START);
  if (start < 0) return null;
  const slutt = tekst.indexOf(ONSKE_SLUTT, start + ONSKE_START.length);
  if (slutt < 0) return null;
  try {
    const raw = JSON.parse(tekst.slice(start + ONSKE_START.length, slutt)) as unknown;
    if (!raw || typeof raw !== 'object') return null;
    const rec = raw as Record<string, unknown>;
    const ut: EndringOnske = {};
    if (typeof rec.startsAt === 'string' && !Number.isNaN(Date.parse(rec.startsAt))) {
      ut.startsAt = rec.startsAt;
    }
    if (typeof rec.mechanicId === 'string' && UUID_RE.test(rec.mechanicId)) {
      ut.mechanicId = rec.mechanicId;
    }
    if (!ut.startsAt && !ut.mechanicId) return null;
    return ut;
  } catch {
    return null;
  }
}

export function stripEndringOnske(tekst: string): string {
  const start = tekst.lastIndexOf(ONSKE_START);
  if (start < 0) return tekst;
  const slutt = tekst.indexOf(ONSKE_SLUTT, start + ONSKE_START.length);
  if (slutt < 0) return tekst;
  return `${tekst.slice(0, start)}${tekst.slice(slutt + ONSKE_SLUTT.length)}`.trim();
}

export function parseVentendeOnske(
  notes: string | null | undefined,
  kind: EndringKind,
): EndringOnske | null {
  if (!notes) return null;
  const pending = endringPrefiks(kind).trim();
  const treated = endringBehandletPrefiks(kind).trim();
  for (const linje of notes.split('\n')) {
    if (!linje.includes(pending) && !linje.includes(treated)) continue;
    const onske = parseEndringOnskeTekst(linje);
    if (onske) return onske;
  }
  return null;
}

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
  onske?: EndringOnske | null,
): string {
  const tekst = message.trim();
  const merke = onske ? encodeEndringOnske(onske) : '';
  const hale = [tekst, merke].filter(Boolean).join(' ');
  return `${endringPrefiks(kind)}${naa.toLocaleString('nb-NO')}] ${hale}`.trimEnd();
}

export function appendEndringNotat(
  notes: string | null | undefined,
  kind: EndringKind,
  message: string,
  naa: Date = new Date(),
  onske?: EndringOnske | null,
): string {
  const linje = byggEndringLinje(kind, message, naa, onske);
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
  return stripEndringOnske(linjer.join('\n') || notes);
}

export function endringKindFraNotat(notes: string | null | undefined): EndringKind {
  if (harVentendeForespor(notes) || notes?.includes(FORESPOR_BEHANDLET_PREFIKS)) return 'forespor';
  return 'avvik';
}
