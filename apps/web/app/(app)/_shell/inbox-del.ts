/** Filter på lista — ikke egne destinasjoner. */
export type InboxPart = 'alle' | 'customer_dealer' | 'mechanic_dealer' | 'dealer_admin';

/** Claude §4.2 chips. `lost` er ærlig stub — ingen resolved-kolonne. */
export type InboxChip = InboxPart | 'lost';

export type InboxSortering = 'nyeste' | 'eldste' | 'uleste';

export const INNBOKS_FILTERE: { key: InboxPart; label: string }[] = [
  { key: 'alle', label: 'Alle chatter' },
  { key: 'customer_dealer', label: 'Kunder' },
  { key: 'mechanic_dealer', label: 'Intern' },
  { key: 'dealer_admin', label: 'Endwise' },
];

/** Claude FILTERS: Alle · Kunder · Intern · Support · Løst. */
export const INNBOKS_CHIPS: { key: InboxChip; label: string }[] = [
  { key: 'alle', label: 'Alle' },
  { key: 'customer_dealer', label: 'Kunder' },
  { key: 'mechanic_dealer', label: 'Intern' },
  { key: 'dealer_admin', label: 'Support' },
  { key: 'lost', label: 'Løst' },
];

/** Claude PER = 10. Klient-slice av allerede hentet `listThreads`. */
export const INNBOKS_SIDE_STORRELSE = 10;

export function erInboxChip(v: string): v is InboxChip {
  return INNBOKS_CHIPS.some((c) => c.key === v);
}

export function filtrerInboxTrader<T extends { id: string; kind: string }>(
  rader: readonly T[],
  chip: InboxChip,
  skjulte: ReadonlySet<string>,
): T[] {
  if (chip === 'lost') return [];
  return rader.filter((t) => !skjulte.has(t.id)).filter((t) => chip === 'alle' || t.kind === chip);
}

export function sorterInboxTrader<T extends { lastMessageAt: Date | string; unread?: number }>(
  rader: readonly T[],
  sortering: InboxSortering,
): T[] {
  return rader.slice().sort((a, b) => {
    const da = new Date(a.lastMessageAt).getTime();
    const db = new Date(b.lastMessageAt).getTime();
    if (sortering === 'uleste') {
      const ua = a.unread ?? 0;
      const ub = b.unread ?? 0;
      if (ub !== ua) return ub - ua;
      return db - da;
    }
    return sortering === 'eldste' ? da - db : db - da;
  });
}

export function inboxSider(antall: number, per = INNBOKS_SIDE_STORRELSE): number {
  return Math.max(1, Math.ceil(Math.max(0, antall) / per));
}

export function inboxSide<T>(liste: readonly T[], side: number, per = INNBOKS_SIDE_STORRELSE): T[] {
  const sider = inboxSider(liste.length, per);
  const indeks = Math.min(Math.max(0, side), sider - 1);
  const start = indeks * per;
  return liste.slice(start, start + per);
}

export function inboxSideEtikett(
  antall: number,
  side: number,
  per = INNBOKS_SIDE_STORRELSE,
): string {
  if (antall <= 0) return 'Ingen meldinger å vise.';
  const sider = inboxSider(antall, per);
  const indeks = Math.min(Math.max(0, side), sider - 1);
  const fra = indeks * per + 1;
  const til = Math.min(antall, (indeks + 1) * per);
  return `Viser ${fra}–${til} av ${antall}`;
}
