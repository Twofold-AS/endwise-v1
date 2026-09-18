'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { PHONE_DEST_FYLL } from '../_shell/phone-home';

import type { PulseTallCelle } from './pulse-tall-celler';

export type { PulseTallCelle } from './pulse-tall-celler';
export { pulseTallCeller } from './pulse-tall-celler';

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
          <div
            key={c.id}
            data-pulse-tall-celle={c.id}
            className="min-w-0 rounded-[16px] bg-surface-2 px-3 py-2 shadow-none"
          >
            <p className="text-[12px] font-[300] leading-4 text-fg-muted">{c.label}</p>
            <p className="text-title font-[650] tabular-nums text-fg">{c.verdi}</p>
          </div>
        ))}
      </div>
    </Link>
  );
}
