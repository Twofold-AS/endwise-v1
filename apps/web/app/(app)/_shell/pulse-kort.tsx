'use client';

import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PHONE_DEST_FYLL, PHONE_HERO_FYLL } from './phone-home';

/**
 * Operativt pulse-kort på forhandler-hjem.
 * Mobbin: 24px, ingen skygge, ingen pip/border-left.
 * Egen komposisjon — shadcn Card er New York-boxed, ikke denne flaten.
 */
export function PulseKort({
  href,
  navn,
  verdi,
  meta,
  children,
  variant = 'hvile',
  laster = false,
}: {
  href: string;
  navn: string;
  verdi?: string | number;
  meta?: string;
  children?: ReactNode;
  variant?: 'hero' | 'hvile';
  laster?: boolean;
}) {
  const fyll = variant === 'hero' ? PHONE_HERO_FYLL : PHONE_DEST_FYLL;
  return (
    <Link
      href={href as Route}
      data-pulse-kort={navn}
      data-verkstedet-hero={variant === 'hero' ? '' : undefined}
      className={`${fyll} flex min-h-11 w-full flex-col gap-3 p-5 [touch-action:manipulation]`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-title text-fg">{navn}</p>
        {verdi != null ? (
          <p className="text-[28px] font-semibold leading-none text-fg tabular-nums">
            {laster ? (
              <span className="inline-block h-7 w-10 animate-pulse rounded-sm bg-border" />
            ) : (
              verdi
            )}
          </p>
        ) : null}
      </div>
      {meta ? <p className="text-[12px] text-fg-muted leading-snug">{meta}</p> : null}
      {children}
    </Link>
  );
}

export function PulseTall({
  label,
  verdi,
  laster,
}: {
  label: string;
  verdi: number;
  laster: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 px-3 first:pl-0 last:pr-0">
      <p className="text-[12px] text-fg-muted">{label}</p>
      <p className="text-[28px] font-semibold leading-none text-fg tabular-nums">
        {laster ? (
          <span className="inline-block h-7 w-8 animate-pulse rounded-sm bg-border" />
        ) : (
          verdi
        )}
      </p>
    </div>
  );
}

export function PulseFooter() {
  return (
    <nav
      data-pulse-footer
      aria-label="Mer"
      className="flex flex-wrap items-center gap-x-2 px-1 text-label text-fg-muted"
    >
      <Link href={'/organisasjon' as Route} className="hover:text-fg">
        Organisasjon
      </Link>
      <span aria-hidden>·</span>
      <Link href={'/support' as Route} className="hover:text-fg">
        Hjelp
      </Link>
    </nav>
  );
}
