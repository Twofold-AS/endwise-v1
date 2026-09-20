/** Lager-hub statusblokk — Claude-struktur under Endwise-chrome. */

export const LAGER_HUB_STATUS = ['På lager', 'Tilgjengelig', 'Reservert', 'Under minimum'] as const;

export type LagerHubStatus = (typeof LAGER_HUB_STATUS)[number];

export const LAGER_HUB_LENKER = [
  {
    id: 'deler',
    label: 'Deler',
    href: '/lager/deler',
    sub: 'Beholdning, plassering og minimum',
  },
  {
    id: 'logg',
    label: 'Inn- og utlogg',
    href: '/lager/bevegelser',
    sub: 'Siste bevegelser på lageret',
  },
  {
    id: 'bestill',
    label: 'Bestill deler',
    href: '/lager/deler',
    sub: 'Under minimum',
  },
  {
    id: 'salg',
    label: 'Kjøretøy til salgs',
    href: '/butikk?se=kjoretoy',
    sub: 'Beholdning for salg',
  },
] as const;

export function lagerPageSub(antall: number): string {
  return `${antall} delenummer`;
}

export function lagerBestillSub(underMinimum: number): string {
  return `${underMinimum} under minimum`;
}
