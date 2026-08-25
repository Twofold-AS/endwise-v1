/**
 * F5-19 — Innstillinger som én flate med pille-faner.
 *
 * Fanerekkefølge (25.08.2026): Profil · Integrasjoner · Abonnement ·
 * Varsler · Tjenester & priser.
 *
 * Team er IKKE en fane — #41 la destinasjonen i sidebaren
 * (`/innstillinger/team`), 25.08 omdøpt til Organisasjon. Admin-faner
 * skjules for ikke-admin, og hele dealer-huben (Abonnement, Integrasjoner,
 * Varsler, Tjenester & priser) skjules for Endwise-plattform. «Bytt konto /
 * mekaniker» er IKKE en fane — visningsbytte bor i sidebar-headeren.
 */

export const FANE_IDS = ['profil', 'integrasjoner', 'abonnement', 'varsler', 'tjenester'] as const;

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
    id: 'integrasjoner',
    label: 'Integrasjoner',
    ingress:
      'Verktøy fra andre leverandører som Endwise snakker med. Endwise-egne funksjoner ligger under Tjenester & priser.',
    adminOnly: true,
  },
  {
    id: 'abonnement',
    label: 'Abonnement',
    ingress: 'Flat pris per verksted. Ubegrenset antall brukere. Alle priser eks. mva.',
    adminOnly: true,
  },
  {
    id: 'varsler',
    label: 'Varsler',
    ingress: 'Hvilke kanaler verkstedet bruker mot kunder og ansatte.',
  },
  {
    id: 'tjenester',
    label: 'Tjenester & priser',
    ingress:
      'Funksjonene Endwise har bygget, og hva de koster. Andres verktøy ligger under Integrasjoner.',
    adminOnly: true,
  },
];

const FANE_SETT = new Set<string>(FANE_IDS);

export function erFaneId(v: string | null | undefined): v is FaneId {
  return typeof v === 'string' && FANE_SETT.has(v);
}

/**
 * Les `?fane=` (eller en kjent alias-sti) og fall tilbake til Profil når
 * verdien er ukjent eller admin-only for en ikke-admin.
 */
export function parseFane(
  raw: string | null | undefined,
  isAdmin: boolean,
  fallback: FaneId = 'profil',
  erForhandler = true,
): FaneId {
  if (!erForhandler) return 'profil';
  const kandidat: FaneId = erFaneId(raw) ? raw : fallback;
  const def = FANER.find((f) => f.id === kandidat);
  if (!def || (def.adminOnly && !isAdmin)) return 'profil';
  return kandidat;
}

/**
 * Dealer-faner kun i forhandler-kontekst. Endwise-admin/support på
 * plattform ser Profil alene — ikke Abonnement som om de var forhandler.
 */
export function synligeFaner(isAdmin: boolean, erForhandler = true): FaneDef[] {
  if (!erForhandler) return FANER.filter((f) => f.id === 'profil');
  return FANER.filter((f) => !f.adminOnly || isAdmin);
}

/** Kanonisk URL for en fane. Gamle stier aliaser hit. */
export function innstillingerHref(fane: FaneId): string {
  return `/innstillinger?fane=${fane}`;
}

/**
 * Alias-stier som skal lande på samme skall. Brukes av sidene selv (startFane)
 * og av tester — ikke av sidebaren, som beholder de gamle href-ene.
 *
 * `/innstillinger/team` er IKKE alias: Team er egen sidebar-destinasjon (#41).
 */
export const FANE_ALIAS: Readonly<Record<string, FaneId>> = {
  '/innstillinger/profil': 'profil',
  '/innstillinger/varsler': 'varsler',
  '/innstillinger/tjenester': 'tjenester',
  '/abonnement': 'abonnement',
  '/integrasjoner': 'integrasjoner',
  '/tjenester': 'tjenester',
};
