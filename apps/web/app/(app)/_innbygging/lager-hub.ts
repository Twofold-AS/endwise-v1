/** Lager-hub statusblokk — Claude-struktur under Endwise-chrome. */

export const LAGER_HUB_STATUS = ['På lager', 'Tilgjengelig', 'Reservert', 'Under minimum'] as const;

export type LagerHubStatus = (typeof LAGER_HUB_STATUS)[number];

export const LAGER_HUB_LENKER = [
  {
    label: 'Deler',
    href: '/lager/deler',
    sub: 'Beholdning, plassering og minimum',
  },
  {
    label: 'Inn- og utlogg',
    href: '/lager/bevegelser',
    sub: 'Siste bevegelser på lageret',
  },
] as const;

export function lagerPageSub(antall: number): string {
  return `${antall} delenummer`;
}
