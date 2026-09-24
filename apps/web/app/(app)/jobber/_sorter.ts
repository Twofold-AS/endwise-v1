export const DAGSLISTE_SORTER = ['tid', 'kunde', 'status', 'mekaniker'] as const;

export type DagslisteSorter = (typeof DAGSLISTE_SORTER)[number];

export const DAGSLISTE_SORTER_LABEL: Record<DagslisteSorter, string> = {
  tid: 'Tid',
  kunde: 'Kunde',
  status: 'Status',
  mekaniker: 'Mekaniker',
};

export type DagslisteJobb = {
  id: string;
  startsAt: Date | string;
  customerName?: string | null;
  status: string;
  mechanicName?: string | null;
};

function nb(a: string, b: string): number {
  return a.localeCompare(b, 'nb');
}

/** Klient-sortering på allerede hentet dagsdata. */
export function sorterDagsliste<T extends DagslisteJobb>(
  rader: readonly T[],
  sorter: DagslisteSorter,
): T[] {
  const kopi = [...rader];
  kopi.sort((a, b) => {
    if (sorter === 'tid') {
      return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    }
    if (sorter === 'kunde') {
      return nb(a.customerName ?? '', b.customerName ?? '');
    }
    if (sorter === 'status') {
      return nb(a.status, b.status);
    }
    return nb(a.mechanicName ?? '', b.mechanicName ?? '');
  });
  return kopi;
}
