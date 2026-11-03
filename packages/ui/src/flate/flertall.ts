/** Norsk telling: 0 = «Ingen X», 1 = «1 entall», ellers «N flertall». */
export function flertall(n: number, entall: string, mange: string): string {
  if (n === 0) return `Ingen ${mange}`;
  if (n === 1) return `1 ${entall}`;
  return `${n} ${mange}`;
}

export function flertallTilbys(n: number, entall: string, mange: string): string {
  if (n === 0) return `Ingen ${mange} ennå`;
  if (n === 1) return `1 ${entall} tilbys`;
  return `${n} ${mange} tilbys`;
}
