/** Hvilken destinasjon skal vise top-bar 2. */

export function erOrganisasjonSide(pathname: string): boolean {
  if (pathname === '/organisasjon' || pathname.startsWith('/organisasjon/')) return true;
  return /\/endwise\/verksted\/[^/]+\/organisasjon(\/|$)/.test(pathname);
}

export function erDealerInnboks(pathname: string): boolean {
  return pathname === '/innboks' || pathname.startsWith('/innboks/');
}

export function erInnboksSide(pathname: string): boolean {
  if (erDealerInnboks(pathname)) return true;
  return /\/endwise\/verksted\/[^/]+\/innboks(\/|$)/.test(pathname);
}
