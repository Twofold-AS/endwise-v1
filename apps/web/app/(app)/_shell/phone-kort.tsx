'use client';

import type { LucideIcon } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PHONE_HERO_FYLL, PHONE_KORT_FYLL } from './phone-home';

/**
 * Destinasjonskort på forhandler-hjem (Jonas Apple 05.09).
 * Surface/hairline, radius 12 (kort) / 16 (hero). Ulest er invertert prikk — ikke Ny-rød.
 * Hele kortet er primærhandlingen. Hit ≥44.
 */
export function PhoneKort({
  href,
  icon: Icon,
  navn,
  meta,
  ulest,
  children,
  className,
  variant = 'kort',
}: {
  href: string;
  icon: LucideIcon;
  navn: string;
  meta?: string;
  ulest?: number;
  children?: ReactNode;
  className?: string;
  variant?: 'kort' | 'hero';
}) {
  const fyll = variant === 'hero' ? PHONE_HERO_FYLL : PHONE_KORT_FYLL;
  return (
    <Link
      href={href as Route}
      data-phone-kort={navn}
      data-verkstedet-hero={variant === 'hero' ? '' : undefined}
      className={`${fyll} flex min-h-11 flex-col gap-2 p-4 ${className ?? ''}`}
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
      {meta ? (
        <p data-phone-kort-meta className="text-[12px] text-fg-muted leading-snug">
          {meta}
        </p>
      ) : children ? null : (
        <p data-phone-kort-meta className="text-[12px] text-fg-muted leading-snug">
          Ingen data ennå
        </p>
      )}
      {children}
    </Link>
  );
}
