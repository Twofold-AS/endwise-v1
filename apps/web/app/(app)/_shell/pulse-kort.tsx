'use client';

import { Badge, DitherGrowthChart, type LucideIcon } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PHONE_DEST_FYLL, PHONE_HERO_FYLL } from './phone-home';

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
  navn: string;
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
      data-pulse-kort={navn}
      data-pulse-mock={mock ? '' : undefined}
      data-verkstedet-hero={variant === 'hero' ? '' : undefined}
      className={`${fyll} flex min-h-11 w-full flex-col gap-3 p-5 [touch-action:manipulation]`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <p className="text-title text-fg">{navn}</p>
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

/** Hvit sirkel (mørkt: hvit) rundt ikon — ink-strek så ikonet synes. */
export function PulseIkonFlate({
  variant = 'circle',
  children,
}: {
  variant?: 'circle' | 'box';
  children: ReactNode;
}) {
  return (
    <span
      data-pulse-ikon-flate={variant}
      className={`flex size-9 shrink-0 items-center justify-center bg-white text-[#141414] ring-1 ring-divide ${
        variant === 'circle' ? 'rounded-full' : 'rounded-[6px]'
      }`}
    >
      {children}
    </span>
  );
}

/** Pil med hale mot telleren — speil av TilbakePil. */
export function PulsePilHale({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="presentation"
      aria-hidden
      data-pulse-pil-hale
    >
      <path
        d="M5 12h14M12 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type PulseTrend = {
  antall: number;
  tone: 'green' | 'red' | 'neutral';
  ratio: number;
  mock: boolean;
};

/** Mini-statlinje. Grønn/rød kun her — ikke merkevare-CTA. */
export function PulseTrendBar({ trend }: { trend: PulseTrend }) {
  const fyll =
    trend.tone === 'green' ? 'bg-success' : trend.tone === 'red' ? 'bg-danger' : 'bg-fg-faint';
  return (
    <span
      data-pulse-trend={trend.tone}
      data-pulse-trend-mock={trend.mock ? '' : undefined}
      className="flex shrink-0 items-center gap-1"
      title="Nye forespørsler mot vanlig dagsnitt"
    >
      <span className="relative block h-1 w-7 overflow-hidden rounded-full bg-inset">
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${fyll}`}
          style={{ width: `${Math.round(trend.ratio * 100)}%` }}
        />
      </span>
      <span
        className={`text-[12px] leading-none tabular-nums ${
          trend.tone === 'green'
            ? 'text-success'
            : trend.tone === 'red'
              ? 'text-danger'
              : 'text-fg-muted'
        }`}
      >
        {trend.antall}
      </span>
    </span>
  );
}

/**
 * Én horisontal linje: hvit ikonflate · tekst · pil+teller · ev. trend.
 * Mørk-modus: sirkel/boks forblir hvit.
 */
export function PulseLinjeKort({
  href,
  ikon: Ikon,
  ikonVariant = 'circle',
  tekst,
  tall,
  laster = false,
  mock = false,
  trend,
}: {
  href: string;
  ikon: LucideIcon;
  ikonVariant?: 'circle' | 'box';
  tekst: string;
  tall?: string | number;
  laster?: boolean;
  mock?: boolean;
  trend?: PulseTrend;
}) {
  return (
    <Link
      href={href as Route}
      data-pulse-kort={tekst}
      data-pulse-linje=""
      data-pulse-mock={mock ? '' : undefined}
      className="flex min-h-11 w-full items-center gap-2.5 rounded-[24px] border border-divide bg-surface-2 px-4 py-3 text-fg shadow-none [touch-action:manipulation]"
    >
      <PulseIkonFlate variant={ikonVariant}>
        <Ikon className="size-4" strokeWidth={2} aria-hidden />
      </PulseIkonFlate>
      <span className="min-w-0 flex-1 truncate text-label text-fg">{tekst}</span>
      {mock ? <PulseMockBadge /> : null}
      {tall != null ? (
        <span className="flex shrink-0 items-center gap-1.5 text-fg">
          <PulsePilHale />
          <span className="text-title tabular-nums">
            {laster ? (
              <span className="inline-block h-4 w-6 animate-pulse rounded-sm bg-border" />
            ) : (
              tall
            )}
          </span>
        </span>
      ) : null}
      {trend ? <PulseTrendBar trend={trend} /> : null}
    </Link>
  );
}

/** Mini Amicro-dither-boble: denne måneden vs forrige. Tall i klartekst under. */
export function PulseMaanedBoble({
  denne,
  forrige,
  mork,
}: {
  denne: number;
  forrige: number;
  mork: boolean;
}) {
  const denneFarge = mork ? WHITE : INK;
  return (
    <div data-pulse-maaned-boble className="flex shrink-0 flex-col items-center gap-1">
      <p className="sr-only">
        {denne} bookinger denne måneden, {forrige} forrige
      </p>
      <div
        className="relative shrink-0 overflow-hidden rounded-full bg-bg ring-1 ring-divide"
        style={{ width: 72, height: 72 }}
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <DitherGrowthChart
            compact
            className="h-full w-full"
            values={[Math.max(0, forrige), Math.max(0, denne)]}
            labels={['Forrige', 'Denne']}
            color={denneFarge}
          />
        </div>
      </div>
      <p className="text-[11px] leading-none text-fg-muted tabular-nums">
        {denne}
        <span className="text-fg-faint"> · </span>
        {forrige}
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
