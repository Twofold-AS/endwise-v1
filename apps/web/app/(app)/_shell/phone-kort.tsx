'use client';

import type { LucideIcon } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PHONE_KORT_FYLL } from './phone-home';

/**
 * Destinasjonskort på telefon-hjem.
 * Samme flate/tekst som CardShell (bg-card / text-fg), radius 12.
 * Ulest er invertert prikk/tall — ikke Ny-rød.
 */
export function PhoneKort({
  href,
  icon: Icon,
  navn,
  meta,
  ulest,
  children,
  className,
}: {
  href: string;
  icon: LucideIcon;
  navn: string;
  meta?: string;
  ulest?: number;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href as Route}
      data-phone-kort={navn}
      className={`${PHONE_KORT_FYLL} flex flex-col gap-2 p-3 ${className ?? ''}`}
    >
      <div className="flex items-center gap-2">
        <Icon size={16} strokeWidth={1.75} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate text-title">{navn}</span>
        {ulest && ulest > 0 ? (
          <span className="inline-flex size-5 min-w-5 items-center justify-center rounded-full bg-fg text-[11px] text-bg tabular-nums">
            <span className="sr-only">{ulest} uleste. </span>
            {ulest}
          </span>
        ) : null}
      </div>
      {meta ? <p className="text-[12px] text-fg-muted leading-snug">{meta}</p> : null}
      {children}
    </Link>
  );
}
