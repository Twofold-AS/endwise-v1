'use client';

import { ChevronRight, type LucideIcon } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PHONE_DEST_FYLL, PHONE_HERO_FYLL, PHONE_KORT_FYLL } from './phone-home';

/**
 * Destinasjonskort på telefon-hjem.
 * Mekaniker (`kort`): samme flate som før.
 * Dealer Apple (`hero` / `destinasjon`): plate + iOS Settings-meta.
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
  variant = 'kort',
}: {
  href: string;
  icon: LucideIcon;
  navn: string;
  meta?: string;
  ulest?: number;
  children?: ReactNode;
  className?: string;
  variant?: 'kort' | 'hero' | 'destinasjon';
}) {
  const fyll =
    variant === 'hero'
      ? PHONE_HERO_FYLL
      : variant === 'destinasjon'
        ? PHONE_DEST_FYLL
        : PHONE_KORT_FYLL;
  const apple = variant === 'hero' || variant === 'destinasjon';
  const tittel =
    variant === 'hero'
      ? 'min-w-0 flex-1 truncate text-[28px] font-semibold leading-tight tracking-tight text-fg'
      : variant === 'destinasjon'
        ? 'min-w-0 flex-1 truncate text-[17px] font-semibold leading-snug text-fg'
        : 'min-w-0 flex-1 truncate text-title';
  const luft = variant === 'hero' ? 'gap-5 p-5' : apple ? 'gap-2.5 p-4' : 'gap-2 p-3';

  return (
    <Link
      href={href as Route}
      data-phone-kort={navn}
      data-verkstedet-hero={variant === 'hero' ? '' : undefined}
      className={`${fyll} flex min-h-11 flex-col [touch-action:manipulation] ${luft} ${className ?? ''}`}
    >
      <div className="flex items-center gap-2">
        {variant === 'hero' ? null : (
          <Icon
            size={variant === 'destinasjon' ? 18 : 16}
            strokeWidth={1.75}
            className={`shrink-0 ${variant === 'destinasjon' ? 'text-fg-muted' : ''}`}
          />
        )}
        <span className={tittel}>{navn}</span>
        {ulest && ulest > 0 ? (
          <span className="inline-flex size-5 min-w-5 items-center justify-center rounded-full bg-fg text-[11px] text-bg tabular-nums">
            <span className="sr-only">{ulest} uleste. </span>
            {ulest}
          </span>
        ) : null}
        {variant === 'destinasjon' ? (
          <ChevronRight
            size={16}
            strokeWidth={1.75}
            className="shrink-0 text-primary"
            aria-hidden
          />
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
