'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { PHONE_DEST_FYLL } from '../_shell/phone-home';

export type PulseTallCelle = {
  id: string;
  label: string;
  verdi: string | number;
};

/**
 * Pulse-kort #7 «Tall» — kompakt 2×2 Mobbin.
 * Visninger · Bookinger · Returer · Credits (hvis entitlement).
 * Hele kortet → /analyse (alias /statistikk). Erstatter ikke I dag-spark.
 */
export function PulseTallKort({
  celler,
  href = '/statistikk',
}: {
  celler: readonly PulseTallCelle[];
  href?: string;
}) {
  const synlige = celler.slice(0, 4);
  return (
    <Link
      href={href as Route}
      data-pulse-tall-kort
      data-pulse-kort="tall"
      className={`${PHONE_DEST_FYLL} flex w-full flex-col gap-2 px-4 py-3 [touch-action:manipulation]`}
    >
      <p className="text-label text-fg">Tall</p>
      <div data-pulse-tall-rutenett className="grid grid-cols-2 gap-2">
        {synlige.map((c) => (
          <div key={c.id} data-pulse-tall-celle={c.id} className="min-w-0">
            <p className="text-[12px] leading-4 text-fg-muted">{c.label}</p>
            <p className="text-title tabular-nums text-fg">{c.verdi}</p>
          </div>
        ))}
      </div>
    </Link>
  );
}

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
