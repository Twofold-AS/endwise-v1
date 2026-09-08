'use client';

import { ArrowUpRight, Badge, DitherGrowthChart, type LucideIcon, Plus } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PHONE_DEST_FYLL, PHONE_HERO_FYLL } from './phone-home';
import { manedSparkVerdier } from './phone-home-pulse';

const INK = '#141414';
const WHITE = '#ffffff';

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
  mock = false,
}: {
  href: string;
  navn?: string;
  verdi?: string | number;
  meta?: string;
  children?: ReactNode;
  variant?: 'hero' | 'hvile';
  laster?: boolean;
  mock?: boolean;
}) {
  const fyll = variant === 'hero' ? PHONE_HERO_FYLL : PHONE_DEST_FYLL;
  return (
    <Link
      href={href as Route}
      data-pulse-kort={navn ?? 'hero'}
      data-pulse-mock={mock ? '' : undefined}
      data-verkstedet-hero={variant === 'hero' ? '' : undefined}
      className={`${fyll} flex min-h-11 w-full flex-col gap-3 p-5 [touch-action:manipulation]`}
    >
      {navn || verdi != null || mock ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {navn ? <p className="text-title text-fg">{navn}</p> : null}
            {mock ? <PulseMockBadge /> : null}
          </div>
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
      ) : null}
      {meta ? <p className="text-[12px] text-fg-muted leading-snug">{meta}</p> : null}
      {children}
    </Link>
  );
}

/** Mangel på historikk — ikke «For lite data». Canvas-soft, ikke Popular-blå. */
export function PulseMockBadge() {
  return (
    <Badge
      variant="secondary"
      data-pulse-mock-badge
      className="border-transparent bg-surface-2 text-fg-muted"
    >
      mock
    </Badge>
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

/**
 * Fast lys ikonplate — alltid hvit, også i mørk modus.
 * Ikke `bg-card` / `bg-canvas` (de går mørke med tema).
 */
export function PulseIkonFlate({ children }: { children: ReactNode }) {
  return (
    <span
      data-pulse-ikonboks
      className="flex size-11 shrink-0 items-center justify-center rounded-[12px] text-[#141414] shadow-none ring-1 ring-divide"
      style={{ backgroundColor: WHITE }}
    >
      {children}
    </span>
  );
}

/** Amicro linje/growth som mini-boble: denne måneden vs forrige. Ikke donut. */
export function PulseManedBoble({
  denne,
  forrige,
  mock = false,
}: {
  denne: number;
  forrige: number;
  mock?: boolean;
}) {
  return (
    <div
      data-pulse-boble
      className="flex shrink-0 flex-col items-center gap-1"
      title={`Denne måneden ${denne} · forrige ${forrige}`}
    >
      <div
        className="pointer-events-none h-12 w-[4.75rem] overflow-hidden rounded-[16px] ring-1 ring-divide"
        style={{ backgroundColor: WHITE }}
        aria-hidden
      >
        <DitherGrowthChart
          theme="light"
          compact
          className="h-full w-full"
          values={manedSparkVerdier(forrige, denne)}
          labels={['Forrige', 'Denne']}
          color={INK}
        />
      </div>
      <p className="text-[11px] text-fg-muted tabular-nums">
        {denne}
        <span className="text-fg-faint"> · </span>
        {forrige}
        {mock ? <span className="sr-only"> mock</span> : null}
      </p>
    </div>
  );
}

/**
 * Én-linjes radkort: hvit ikonboks · tittel · hale-pil · teller.
 * Ingen mini-stats / trend.
 */
export function PulseRadKort({
  href,
  ikon: Ikon,
  tittel,
  teller,
  mock = false,
  laster = false,
}: {
  href: string;
  ikon: LucideIcon;
  tittel: string;
  teller?: string | number;
  mock?: boolean;
  laster?: boolean;
}) {
  return (
    <Link
      href={href as Route}
      data-pulse-rad={tittel}
      data-pulse-mock={mock ? '' : undefined}
      className={`${PHONE_DEST_FYLL} flex min-h-11 w-full items-center gap-3 px-4 py-3 [touch-action:manipulation]`}
    >
      <PulseIkonFlate>
        <Ikon size={22} strokeWidth={1.75} aria-hidden />
      </PulseIkonFlate>
      <span className="min-w-0 flex-1 truncate text-label text-fg">{tittel}</span>
      <ArrowUpRight size={16} strokeWidth={1.75} className="shrink-0 text-fg-muted" aria-hidden />
      <span className="shrink-0 text-label text-fg tabular-nums">
        {laster ? (
          <span className="inline-block h-4 w-6 animate-pulse rounded-sm bg-border" />
        ) : (
          teller
        )}
      </span>
      {mock ? <PulseMockBadge /> : null}
    </Link>
  );
}

/** Én linje: hvit ikonboks med + og «Jobb» ved siden av — samme mønster som Innboks/Lager. */
export function PulseJobbFlis() {
  return (
    <Link
      href={'/bookinger/ny' as Route}
      data-pulse-jobb
      className={`${PHONE_DEST_FYLL} flex min-h-11 items-center gap-3 px-4 py-3 text-fg [touch-action:manipulation]`}
    >
      <PulseIkonFlate>
        <Plus size={22} strokeWidth={1.75} aria-hidden />
      </PulseIkonFlate>
      <span className="text-label">Jobb</span>
    </Link>
  );
}
