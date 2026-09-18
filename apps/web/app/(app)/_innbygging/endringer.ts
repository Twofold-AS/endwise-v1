/**
 * Endringer-katalog: Utvidet tid · Bytte mekaniker · Flytte jobb · Avvik.
 * Leser ekte `[AVVIK `-notat når det finnes; øvrige typer er merket mock
 * til F7-05 har persistert godkjenning.
 */

export const ENDRING_TYPER = [
  { id: 'utvidet', label: 'Utvidet tid' },
  { id: 'bytte', label: 'Bytte mekaniker' },
  { id: 'flytte', label: 'Flytte jobb' },
  { id: 'avvik', label: 'Avvik' },
] as const;

export type EndringTypeId = (typeof ENDRING_TYPER)[number]['id'];

export type EndringBehandling = 'venter' | 'godkjent' | 'avslatt';

export type EndringKort = {
  id: string;
  type: EndringTypeId;
  typeLabel: string;
  meldtAv: string;
  jobb: string;
  jobbId: string;
  forslag: string;
  behandling: EndringBehandling;
  notes?: string | null;
  mock?: boolean;
};

const TYPE_FRA_NOTAT: { needle: string; type: EndringTypeId }[] = [
  { needle: 'bytte', type: 'bytte' },
  { needle: 'mekaniker', type: 'bytte' },
  { needle: 'flytt', type: 'flytte' },
  { needle: 'utvid', type: 'utvidet' },
  { needle: 'ekstra tid', type: 'utvidet' },
];

export function endringTypeFraNotat(notes: string | null | undefined): EndringTypeId {
  const lav = (notes ?? '').toLowerCase();
  for (const rad of TYPE_FRA_NOTAT) {
    if (lav.includes(rad.needle)) return rad.type;
  }
  return 'avvik';
}

export function typeLabel(type: EndringTypeId): string {
  return ENDRING_TYPER.find((t) => t.id === type)?.label ?? 'Avvik';
}

export function forslagFraNotat(notes: string | null | undefined): string {
  if (!notes?.trim()) return 'Ingen foreslått tid eller mekaniker.';
  const linjer = notes
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return linjer[linjer.length - 1] ?? notes;
}

type BookingRad = {
  id: string;
  status: string;
  notes?: string | null;
  serviceName?: string | null;
  regNumber?: string | null;
  mechanicName?: string | null;
  customerName?: string | null;
};

export function endringerFraBookinger(
  jobber: readonly BookingRad[],
  behandlet: ReadonlyMap<string, EndringBehandling>,
): EndringKort[] {
  return jobber
    .filter((j) => j.status !== 'cancelled' && (j.notes ?? '').includes('[AVVIK'))
    .map((j) => {
      const type = endringTypeFraNotat(j.notes);
      return {
        id: j.id,
        type,
        typeLabel: typeLabel(type),
        meldtAv: j.mechanicName?.trim() || 'Mekaniker',
        jobb: [j.serviceName ?? 'Jobb', j.regNumber].filter(Boolean).join(' · '),
        jobbId: j.id,
        forslag: forslagFraNotat(j.notes),
        behandling: behandlet.get(j.id) ?? 'venter',
        notes: j.notes,
      };
    });
}

/** Ærlig tom + én merket mock-rad så forhåndsvisningen er klikkbar. */
export const ENDRINGER_MOCK_EKSEMPEL: EndringKort[] = [
  {
    id: 'mock-utvidet',
    type: 'utvidet',
    typeLabel: 'Utvidet tid',
    meldtAv: 'Kari Mekaniker',
    jobb: 'EU-kontroll · EL12345',
    jobbId: '',
    forslag: 'Foreslått slutt 16.30 (pluss 45 min)',
    behandling: 'venter',
    mock: true,
  },
  {
    id: 'mock-bytte',
    type: 'bytte',
    typeLabel: 'Bytte mekaniker',
    meldtAv: 'Ola Selger',
    jobb: 'Oljeskift · AB98765',
    jobbId: '',
    forslag: 'Foreslått mekaniker: Per Hansen',
    behandling: 'venter',
    mock: true,
  },
  {
    id: 'mock-flytte',
    type: 'flytte',
    typeLabel: 'Flytte jobb',
    meldtAv: 'Kari Mekaniker',
    jobb: 'Dekkskift · EV55555',
    jobbId: '',
    forslag: 'Foreslått onsdag 10.00 · Kari Mekaniker',
    behandling: 'venter',
    mock: true,
  },
  {
    id: 'mock-avvik',
    type: 'avvik',
    typeLabel: 'Avvik',
    meldtAv: 'Per Hansen',
    jobb: 'EU-kontroll · CD11111',
    jobbId: '',
    forslag: 'Sprakk dekk — trenger godkjenning',
    behandling: 'venter',
    mock: true,
  },
];
