'use client';

import { ArrowUpRight, Badge, DitherGrowthChart, type LucideIcon, Plus } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { AnalyserMockStat } from './phone-home-pulse';
import { PHONE_DEST_FYLL, PHONE_HERO_FYLL } from './phone-home';

const WHITE = '#ffffff';
/** Mobbin-aksent — tillatt på hjem-spark (Mikael CODE-GO). */
export const PULSE_SPARK_BLA = '#0066ff';

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
      data-verkstedet-hero={variant === 'hero' ? '' : undefined}
      className={`${fyll} flex min-h-11 w-full flex-col gap-3 p-5 [touch-action:manipulation]`}
    >
      {navn || verdi != null ? (
        <div className="flex items-center justify-between gap-3">
          {navn ? <p className="text-title text-fg">{navn}</p> : null}
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
    <div className="flex flex-col items-center gap-1 px-3 text-center first:pl-0 last:pr-0">
      <p className="text-[28px] font-semibold leading-none text-fg tabular-nums">
        {laster ? (
          <span className="inline-block h-7 w-8 animate-pulse rounded-sm bg-border" />
        ) : (
          verdi
        )}
      </p>
      <p className="text-[12px] text-fg-muted">{label}</p>
    </div>
  );
}

/**
 * Avlang ikonplate — alltid hvit, også i mørk modus.
 * Ikke `bg-card` / `bg-canvas` (de går mørke med tema).
 */
export function PulseIkonFlate({ children }: { children: ReactNode }) {
  return (
    <span
      data-pulse-ikonboks
      className="flex h-9 w-14 shrink-0 items-center justify-center rounded-[12px] text-[#141414] shadow-none ring-1 ring-divide"
      style={{ backgroundColor: WHITE }}
    >
      {children}
    </span>
  );
}

/** Amicro dither under tallene — denne uken, blå linje. */
export function PulseUkeSpark({ verdier }: { verdier: number[] }) {
  return (
    <div data-pulse-spark className="h-14 w-full overflow-hidden rounded-[16px]" aria-hidden>
      <DitherGrowthChart
        compact
        className="h-full w-full"
        values={verdier}
        labels={verdier.map((_, i) => String(i + 1))}
        color={PULSE_SPARK_BLA}
      />
    </div>
  );
}

/** @deprecated Bruk PulseUkeSpark. */
export function Pulse30dSpark({ verdier }: { verdier: number[] }) {
  return <PulseUkeSpark verdier={verdier} />;
}

/**
 * Én-linjes radkort: hvit ikonboks · tittel · hale-pil · teller.
 * Ingen mini-stats / trend. Ingen mock-badge.
 */
export function PulseRadKort({
  href,
  ikon: Ikon,
  tittel,
  teller,
  laster = false,
  kompakt = false,
}: {
  href: string;
  ikon: LucideIcon;
  tittel: string;
  teller?: string | number;
  mock?: boolean;
  laster?: boolean;
  /** Par-flis: skjul pil så 50/50-sporet ikke sprekker. */
  kompakt?: boolean;
}) {
  return (
    <Link
      href={href as Route}
      data-pulse-rad={tittel}
      className={`${PHONE_DEST_FYLL} flex h-full min-h-11 w-full min-w-0 items-center overflow-hidden py-3 [touch-action:manipulation] ${
        kompakt ? 'gap-2 px-3' : 'gap-3 px-4'
      }`}
    >
      <PulseIkonFlate>
        <Ikon size={22} strokeWidth={1.75} aria-hidden />
      </PulseIkonFlate>
      <span className="min-w-0 flex-1 truncate text-label text-fg">{tittel}</span>
      {kompakt ? null : (
        <ArrowUpRight size={16} strokeWidth={1.75} className="shrink-0 text-fg-muted" aria-hidden />
      )}
      <span className="shrink-0 text-label text-fg tabular-nums">
        {laster ? (
          <span className="inline-block h-4 w-6 animate-pulse rounded-sm bg-border" />
        ) : (
          teller
        )}
      </span>
    </Link>
  );
}

/** +Jobb — samme spor som På jobb (50/50). Litt større enn radkortene. */
export function PulseJobbFlis() {
  return (
    <Link
      href={'/bookinger/ny' as Route}
      data-pulse-jobb
      className={`${PHONE_DEST_FYLL} flex h-full min-h-14 w-full min-w-0 items-center gap-3 overflow-hidden px-3 py-3.5 text-fg [touch-action:manipulation]`}
    >
      <PulseIkonFlate>
        <Plus size={22} strokeWidth={1.75} aria-hidden />
      </PulseIkonFlate>
      <span className="truncate text-[15px] font-[650]">Jobb</span>
    </Link>
  );
}

/**
 * Analyser — to deler over Innboks/Lager/Jobb.
 * Del 1: tittel + Se tall. Del 2: dither-rutenett (nettsidevisninger, mock).
 */
export function PulseAnalyserKort({
  stats,
  href,
}: {
  stats: AnalyserMockStat[];
  href: string;
}) {
  return (
    <Link
      href={href as Route}
      data-pulse-analyser
      className={`${PHONE_DEST_FYLL} flex min-h-[220px] w-full flex-1 flex-col overflow-hidden [touch-action:manipulation]`}
    >
      <div
        data-analyser-del="1"
        className="flex shrink-0 items-center justify-between gap-3 px-4 py-3"
      >
        <p className="text-title text-fg">Analyser</p>
        <span className="inline-flex h-8 items-center rounded-full bg-fg px-3 text-[13px] font-[650] text-bg">
          Se tall
        </span>
      </div>
      <div
        data-analyser-del="2"
        className="grid min-h-0 flex-1 grid-cols-2 gap-2 border-divide border-t px-3 py-3"
      >
        {stats.map((s) => (
          <div key={s.id} data-analyser-stat={s.id} className="flex min-h-0 flex-col gap-1">
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-[11px] text-fg-muted">{s.label}</span>
              <Badge
                variant={s.opp ? 'default' : 'destructive'}
                className={s.opp ? 'border-transparent bg-success-soft text-success' : undefined}
              >
                {s.delta}
              </Badge>
            </div>
            <p className="text-[18px] font-[650] leading-none text-fg tabular-nums">{s.verdi}</p>
            <div className="min-h-[44px] flex-1 overflow-hidden rounded-[10px]" aria-hidden>
              <DitherGrowthChart
                compact
                className="h-full w-full"
                values={s.serie}
                labels={s.serie.map((_, i) => String(i + 1))}
                color={PULSE_SPARK_BLA}
              />
            </div>
          </div>
        ))}
      </div>
    </Link>
  );
}
