export const HJELP_FANE_IDS = ['artikler', 'forespor'] as const;

export type HjelpFaneId = (typeof HJELP_FANE_IDS)[number];

export type HjelpFaneDef = {
  id: HjelpFaneId;
  label: string;
  ingress: string;
};

export const HJELP_FANER: readonly HjelpFaneDef[] = [
  {
    id: 'artikler',
    label: 'Artikler',
    ingress: 'Veiledninger og oppdateringer.',
  },
  {
    id: 'forespor',
    label: 'Forespørsler',
    ingress: 'Skriv til Endwise. Samme kanal som Innboks › Endwise.',
  },
];

const SETT = new Set<string>(HJELP_FANE_IDS);

export function erHjelpFaneId(v: string | null | undefined): v is HjelpFaneId {
  return typeof v === 'string' && SETT.has(v);
}

export function parseHjelpFane(raw: string | null | undefined): HjelpFaneId {
  if (raw === 'foresporsler' || raw === 'forespørsler') return 'forespor';
  return erHjelpFaneId(raw) ? raw : 'artikler';
}

export function hjelpHref(fane: HjelpFaneId): string {
  return `/hjelp?fane=${fane === 'artikler' ? 'artikler' : 'forespor'}`;
}
