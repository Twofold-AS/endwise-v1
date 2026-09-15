export type PulseTallCelle = {
  id: string;
  label: string;
  verdi: string | number;
};

export function pulseTallCeller(args: {
  visninger: number;
  bookinger: number;
  returer: number;
  credits?: number | null;
}): PulseTallCelle[] {
  const celler: PulseTallCelle[] = [
    { id: 'visninger', label: 'Visninger', verdi: args.visninger },
    { id: 'bookinger', label: 'Bookinger', verdi: args.bookinger },
    { id: 'returer', label: 'Returer', verdi: args.returer },
  ];
  if (args.credits != null) {
    celler.push({ id: 'credits', label: 'Credits', verdi: args.credits });
  }
  return celler;
}
