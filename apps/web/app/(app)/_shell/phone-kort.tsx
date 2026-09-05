'use client';

import { ChevronRight, type LucideIcon } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PHONE_DEST_FYLL, PHONE_HERO_FYLL, PHONE_KORT_FYLL } from './phone-home';

const HJEM_CTA_FYLT =
  'inline-flex h-control items-center justify-center rounded-pill bg-primary px-4 text-label text-primary-foreground';
const HJEM_CTA_OUTLINE =
  'inline-flex h-control items-center justify-center rounded-pill border border-[var(--ew-accent)] px-4 text-label text-[var(--ew-accent)]';

export { HJEM_CTA_FYLT, HJEM_CTA_OUTLINE };

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
  as = 'link',
  actions,
}: {
  href: string;
  icon: LucideIcon;
  navn: string;
  meta?: string;
  ulest?: number;
  children?: ReactNode;
  className?: string;
  variant?: 'kort' | 'hero' | 'destinasjon';
  as?: 'link' | 'article';
  actions?: ReactNode;
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
  const luft = variant === 'hero' ? 'gap-6 p-6' : apple ? 'gap-3 p-6' : 'gap-2 p-3';

  const klasse = `${fyll} flex min-h-11 flex-col [touch-action:manipulation] ${luft} ${className ?? ''}`;
  const kropp = (
    <>
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
            className="shrink-0 text-[var(--ew-accent)]"
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
      {actions}
    </>
  );

  if (as === 'article') {
    return (
      <article
        data-phone-kort={navn}
        data-verkstedet-hero={variant === 'hero' ? '' : undefined}
        className={klasse}
      >
        {kropp}
      </article>
    );
  }

  return (
    <Link
      href={href as Route}
      data-phone-kort={navn}
      data-verkstedet-hero={variant === 'hero' ? '' : undefined}
      className={klasse}
    >
      {kropp}
    </Link>
  );
}
