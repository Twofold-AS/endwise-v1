/** F42-04 — dock: Hjem · Bookinger · Meldinger · Profil. Bestill/Kjøretøy via hjem og profil. */
export const KUNDE_DOCK = [
  { href: '/', label: 'Hjem', ikon: 'hjem' },
  { href: '/bookinger', label: 'Bookinger', ikon: 'bookinger' },
  { href: '/meldinger', label: 'Meldinger', ikon: 'meldinger' },
  { href: '/profil', label: 'Profil', ikon: 'profil' },
] as const;

/** Bakoverkompatibel alias — samme fire punkter som docken. */
export const KUNDE_FANER = KUNDE_DOCK;

export function kundeFaneAktiv(path: string, href: string): boolean {
  const p = path.replace(/\/$/, '') || '/';
  if (href === '/') return p === '/' || p === '';
  return p === href || p.startsWith(`${href}/`);
}
