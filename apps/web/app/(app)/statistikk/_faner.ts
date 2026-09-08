export const STATISTIKK_FANE_IDS = ['bookinger', 'salg', 'nettside', 'effektivitet'] as const;

export type StatistikkFaneId = (typeof STATISTIKK_FANE_IDS)[number];

export type StatistikkFaneDef = {
  id: StatistikkFaneId;
  label: string;
  ingress: string;
};

export const STATISTIKK_FANER: readonly StatistikkFaneDef[] = [
  {
    id: 'bookinger',
    label: 'Bookinger',
    ingress: 'Volum og status denne uken.',
  },
  {
    id: 'salg',
    label: 'Salg',
    ingress: 'Omsetning og belegg.',
  },
  {
    id: 'nettside',
    label: 'Nettside',
    ingress: 'Sidevisninger. Ekte tall når analyse er koblet.',
  },
  {
    id: 'effektivitet',
    label: 'Effektivitet',
    ingress: 'Belegg og avlysning.',
  },
];

const SETT = new Set<string>(STATISTIKK_FANE_IDS);

export function erStatistikkFaneId(v: string | null | undefined): v is StatistikkFaneId {
  return typeof v === 'string' && SETT.has(v);
}

export function parseStatistikkFane(raw: string | null | undefined): StatistikkFaneId {
  return erStatistikkFaneId(raw) ? raw : 'bookinger';
}

export function statistikkHref(fane: StatistikkFaneId): string {
  return `/statistikk?fane=${fane}`;
}
