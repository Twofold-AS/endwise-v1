/** Hvilken destinasjon skal vise top-bar 2. */

export function erOrganisasjonSide(pathname: string): boolean {
  if (pathname === '/organisasjon' || pathname.startsWith('/organisasjon/')) return true;
  return /\/endwise\/verksted\/[^/]+\/organisasjon(\/|$)/.test(pathname);
}

export function erDealerInnboks(pathname: string): boolean {
  return pathname === '/innboks' || pathname.startsWith('/innboks/');
}

/** Åpen dealer-tråd (`/innboks/:id`), ikke lista. */
export function innboksTradId(pathname: string): string | null {
  const treff = pathname.match(/^\/innboks\/([^/]+)$/);
  return treff?.[1] ?? null;
}

export function erInnboksTrad(pathname: string): boolean {
  return innboksTradId(pathname) !== null;
}

export function erInnboksSide(pathname: string): boolean {
  if (erDealerInnboks(pathname)) return true;
  return /\/endwise\/verksted\/[^/]+\/innboks(\/|$)/.test(pathname);
}
