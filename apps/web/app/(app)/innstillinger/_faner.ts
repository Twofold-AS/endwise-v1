/**
 * Innstillinger — kun Profil + Varsler.
 * Abonnement, Tjenester & priser og Koblinger bor på Organisasjon.
 */

export const FANE_IDS = ['profil', 'varsler'] as const;

export type FaneId = (typeof FANE_IDS)[number];

export type FaneDef = {
  id: FaneId;
  label: string;
  ingress: string;
  adminOnly?: boolean;
};

export const FANER: readonly FaneDef[] = [
  {
    id: 'profil',
    label: 'Profil',
    ingress: 'Navn, avatar, varslingslyder, sikkerhet og utseende.',
  },
  {
    id: 'varsler',
    label: 'Varsler',
    ingress: 'Hvilke kanaler verkstedet bruker mot kunder og ansatte.',
  },
];

const FANE_SETT = new Set<string>(FANE_IDS);

export function erFaneId(v: string | null | undefined): v is FaneId {
  return typeof v === 'string' && FANE_SETT.has(v);
}

export function parseFane(
  raw: string | null | undefined,
  _isAdmin: boolean,
  fallback: FaneId = 'profil',
  erForhandler = true,
): FaneId {
  if (!erForhandler) return 'profil';
  const kandidat: FaneId = erFaneId(raw) ? raw : fallback;
  const def = FANER.find((f) => f.id === kandidat);
  if (!def) return 'profil';
  return kandidat;
}

export function synligeFaner(_isAdmin: boolean, erForhandler = true): FaneDef[] {
  if (!erForhandler) return FANER.filter((f) => f.id === 'profil');
  return [...FANER];
}

export function innstillingerHref(fane: FaneId): string {
  return `/innstillinger?fane=${fane}`;
}

/**
 * Gamle alias. Abonnement/Koblinger/Tjenester peker ikke lenger hit —
 * de sidene redirecter til Organisasjon.
 */
export const FANE_ALIAS: Readonly<Record<string, FaneId>> = {
  '/innstillinger/profil': 'profil',
  '/innstillinger/varsler': 'varsler',
};
