/**
 * Strukturerte endringslinjer i `bookings.notes`.
 * Avvik fra mekaniker: `[AVVIK …]`.
 * Forespørsel: `[FORESPOR type] startsAt=… endsAt=… mechanicId=… | melding`.
 */

export const FORESPOR_PREFIKS = '[FORESPOR ';
export const AVVIK_PREFIKS = '[AVVIK ';
export const ENDRING_PREFIKS = '[ENDRING ';

export const ENDRING_TYPE_IDER = ['utvidet', 'bytte', 'flytte', 'avvik'] as const;
export type EndringTypeId = (typeof ENDRING_TYPE_IDER)[number];

export type EndringForslag = {
  type: EndringTypeId;
  message: string;
  proposedStartsAt?: string;
  proposedEndsAt?: string;
  proposedMechanicId?: string;
};

const TYPE_SET = new Set<string>(ENDRING_TYPE_IDER);

export function harForesporNotat(notes: string | null | undefined): boolean {
  return Boolean(notes?.includes(FORESPOR_PREFIKS));
}

export function harAvvikNotatLinje(notes: string | null | undefined): boolean {
  return Boolean(notes?.includes(AVVIK_PREFIKS));
}

export function serialiserForespor(input: EndringForslag): string {
  const type = TYPE_SET.has(input.type) ? input.type : 'avvik';
  const felt: string[] = [];
  if (input.proposedStartsAt) felt.push(`startsAt=${input.proposedStartsAt}`);
  if (input.proposedEndsAt) felt.push(`endsAt=${input.proposedEndsAt}`);
  if (input.proposedMechanicId) felt.push(`mechanicId=${input.proposedMechanicId}`);
  const hode = `${FORESPOR_PREFIKS}${type}]`;
  const midt = felt.length > 0 ? ` ${felt.join(' ')}` : '';
  const melding = input.message.trim();
  return melding ? `${hode}${midt} | ${melding}` : `${hode}${midt}`.trim();
}

export function parseForesporLinje(line: string): EndringForslag | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith(FORESPOR_PREFIKS)) return null;
  const slutt = trimmed.indexOf(']');
  if (slutt < 0) return null;
  const typeRaw = trimmed.slice(FORESPOR_PREFIKS.length, slutt).trim();
  const type: EndringTypeId = TYPE_SET.has(typeRaw) ? (typeRaw as EndringTypeId) : 'avvik';
  const rest = trimmed.slice(slutt + 1).trim();
  const [meta, ...meldingDeler] = rest.split('|');
  const felt = Object.fromEntries(
    (meta ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => {
        const i = p.indexOf('=');
        return i < 0 ? [p, ''] : [p.slice(0, i), p.slice(i + 1)];
      }),
  ) as Record<string, string>;
  return {
    type,
    message: meldingDeler.join('|').trim(),
    proposedStartsAt: felt.startsAt || undefined,
    proposedEndsAt: felt.endsAt || undefined,
    proposedMechanicId: felt.mechanicId || undefined,
  };
}

export function sisteForespor(notes: string | null | undefined): EndringForslag | null {
  if (!notes) return null;
  const linjer = notes
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  for (let i = linjer.length - 1; i >= 0; i -= 1) {
    const parsed = parseForesporLinje(linjer[i] ?? '');
    if (parsed) return parsed;
  }
  return null;
}

export function erBehandletNotat(notes: string | null | undefined): boolean {
  return Boolean(
    notes?.includes(`${ENDRING_PREFIKS}godkjent]`) || notes?.includes(`${ENDRING_PREFIKS}avslatt]`),
  );
}

export function serialiserBehandling(til: 'godkjent' | 'avslatt', merknad?: string): string {
  const hode = `${ENDRING_PREFIKS}${til}]`;
  return merknad?.trim() ? `${hode} ${merknad.trim()}` : hode;
}
