/** Claude Kunde.dc.html — seks faner. Deler/Kvitteringer/Mine data bor under Profil. */
export const KUNDE_FANER = [
  { href: '/', label: 'Hjem' },
  { href: '/bestill', label: 'Bestill' },
  { href: '/bookinger', label: 'Bookinger' },
  { href: '/meldinger', label: 'Meldinger' },
  { href: '/kjoretoy', label: 'Kjøretøy' },
  { href: '/profil', label: 'Profil' },
] as const;

export function kundeFaneAktiv(path: string, href: string): boolean {
  const p = path.replace(/\/$/, '') || '/';
  if (href === '/') return p === '/' || p === '';
  return p === href || p.startsWith(`${href}/`);
}
