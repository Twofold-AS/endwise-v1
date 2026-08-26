/**
 * Team-piller — samme ?fane=-mønster som Innstillinger (F5-19).
 *
 * Filtrerer eksisterende `job_function` (F1-14): selger · support · mekaniker.
 * Ingen nye rolle-enum. Leder vises bare under Alle.
 */

export const TEAM_FANE_IDS = ['alle', 'mekanikere', 'selgere', 'support'] as const;

export type TeamFaneId = (typeof TEAM_FANE_IDS)[number];

export type TeamFaneDef = {
  id: TeamFaneId;
  label: string;
  ingress: string;
};

export const TEAM_FANER: readonly TeamFaneDef[] = [
  {
    id: 'alle',
    label: 'Alle',
    ingress: 'Hele teamet. Detaljer åpnes til høyre, som i innboksen.',
  },
  {
    id: 'mekanikere',
    label: 'Mekanikere',
    ingress: 'Samme belastning og ledig-status som på mekanikerflaten.',
  },
  {
    id: 'selgere',
    label: 'Selgere',
    ingress: 'Ansatte med jobbfunksjonen selger.',
  },
  {
    id: 'support',
    label: 'Support',
    ingress: 'Ansatte med jobbfunksjonen support.',
  },
];

const SETT = new Set<string>(TEAM_FANE_IDS);

export function erTeamFane(v: string | null | undefined): v is TeamFaneId {
  return typeof v === 'string' && SETT.has(v);
}

export function parseTeamFane(raw: string | null | undefined): TeamFaneId {
  return erTeamFane(raw) ? raw : 'alle';
}

export function teamHref(fane: TeamFaneId): string {
  return fane === 'alle' ? '/innstillinger/team' : `/innstillinger/team?fane=${fane}`;
}
