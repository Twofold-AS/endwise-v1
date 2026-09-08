'use client';

import { ArrowUpRight, Badge, DitherDonutChart, type LucideIcon, Plus } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PHONE_DEST_FYLL, PHONE_HERO_FYLL } from './phone-home';
import type { InnboksBarPunkt, InnboksTone } from './phone-home-pulse';

const INK = '#141414';
const FAINT = '#adadad';

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

/** Amicro dither-donut som mini-boble: denne måneden vs forrige. */
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
      <div className="pointer-events-none size-16" aria-hidden>
        <DitherDonutChart
          theme="light"
          compact
          slices={[
            { name: 'Denne måneden', value: Math.max(denne, 0.01), color: INK },
            { name: 'Forrige måned', value: Math.max(forrige, 0.01), color: FAINT },
          ]}
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

function PulseMiniBar({ values }: { values: InnboksBarPunkt[] }) {
  const max = Math.max(1, ...values.map((v) => v.n));
  return (
    <div data-pulse-stats-bar className="flex h-4 items-end gap-px" aria-hidden>
      {values.map((v) => (
        <span
          key={v.dag}
          className="w-[3px] rounded-full bg-fg-faint"
          style={{ height: `${Math.max(18, Math.round((v.n / max) * 100))}%` }}
        />
      ))}
    </div>
  );
}

function toneKlasse(tone?: InnboksTone) {
  if (tone === 'ok') return 'text-success';
  if (tone === 'fare') return 'text-danger';
  return 'text-fg';
}

/**
 * Én-linjes radkort: hvit rund ikonboks · tittel · hale-pil · teller
 * · valgfri mini-stats + farget ny-forespørsel.
 */
export function PulseRadKort({
  href,
  ikon: Ikon,
  tittel,
  teller,
  bar,
  nye,
  tone,
  mock = false,
  laster = false,
}: {
  href: string;
  ikon: LucideIcon;
  tittel: string;
  teller?: string | number;
  bar?: InnboksBarPunkt[];
  nye?: number;
  tone?: InnboksTone;
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
      <span
        data-pulse-ikonboks
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card text-fg shadow-none ring-1 ring-divide"
      >
        <Ikon size={16} strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 truncate text-label text-fg">{tittel}</span>
      <ArrowUpRight size={16} strokeWidth={1.75} className="shrink-0 text-fg-muted" aria-hidden />
      <span className="shrink-0 text-label text-fg tabular-nums">
        {laster ? (
          <span className="inline-block h-4 w-6 animate-pulse rounded-sm bg-border" />
        ) : (
          teller
        )}
      </span>
      {bar && bar.length > 0 ? <PulseMiniBar values={bar} /> : null}
      {nye != null && !laster ? (
        <span
          data-pulse-nye={tone}
          className={`shrink-0 text-label tabular-nums ${toneKlasse(tone)}`}
        >
          {nye}
        </span>
      ) : null}
      {mock ? <PulseMockBadge /> : null}
    </Link>
  );
}

/** Hvit boks med + og «Jobb» — ny jobb. */
export function PulseJobbFlis() {
  return (
    <Link
      href={'/bookinger/ny' as Route}
      data-pulse-jobb
      className={`${PHONE_DEST_FYLL} flex min-h-11 min-w-[92px] flex-col items-center justify-center gap-1 px-5 py-4 text-fg [touch-action:manipulation]`}
    >
      <Plus size={20} strokeWidth={1.75} aria-hidden />
      <span className="text-label">Jobb</span>
    </Link>
  );
}
