'use client';

import {
  ArrowRight,
  CircleQuestionMark,
  DitherDonutChart,
  DitherGrowthChart,
  type LucideIcon,
  Plus,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { type ReactNode, useEffect, useState } from 'react';
import {
  PHONE_DEST_FYLL,
  PHONE_HERO_FYLL,
  PULSE_AVVIK_HREF,
  PULSE_ENDRINGER_HREF,
  PULSE_FORESPORSEL_HREF,
  PULSE_MOBIL_DEST_FYLL,
  PULSE_MOBIL_HERO_FYLL,
  PULSE_MOBIL_KORT_FYLL,
} from './phone-home';
import {
  type AnalyserMockStat,
  dagFremgang,
  dagPrikkPunkt,
  fmtPulseKlokke,
  fmtPulseTime,
  PULSE_DAG_BUE_START,
  PULSE_DAG_BUE_SWEEP,
  PULSE_DAG_FYLL_INK,
  PULSE_DAG_FYLL_SOFT,
  PULSE_DAG_PRIKK_NAAL_FRA,
  PULSE_DAG_PRIKK_NAAL_TIL,
  PULSE_DAG_PRIKK_R,
  PULSE_DAG_PRIKK_R_INDRE,
  PULSE_DAG_SLUTT,
  PULSE_DAG_START,
} from './phone-home-pulse';

const WHITE = '#ffffff';

/** Mobbin-ink på hjem-spark — `#0066ff` er kommersiell. */
export const PULSE_SPARK_INK = '#141414';
/** @deprecated Aksent er Popular/savings, ikke hjem-spark. */
export const PULSE_SPARK_BLA = '#141414';

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
  actions,
}: {
  href: string;
  navn?: string;
  verdi?: string | number;
  meta?: string;
  children?: ReactNode;
  variant?: 'hero' | 'hvile';
  laster?: boolean;
  mock?: boolean;
  /** Ikoner utenpå uke-lenken — unngår nestede <a>. */
  actions?: ReactNode;
}) {
  const fyll = variant === 'hero' ? PHONE_HERO_FYLL : PHONE_DEST_FYLL;
  const kropp = (
    <>
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
      {meta ? <p className="text-[13px] text-fg-muted leading-snug">{meta}</p> : null}
      {children}
    </>
  );
  if (actions) {
    return (
      <div
        data-pulse-kort={navn ?? 'hero'}
        data-verkstedet-hero={variant === 'hero' ? '' : undefined}
        className={`${fyll} relative flex min-h-11 w-full flex-col gap-3 p-5`}
      >
        <div
          data-pulse-hero-ikoner
          className="absolute top-4 right-4 z-10 flex items-center gap-1.5"
        >
          {actions}
        </div>
        <Link
          href={href as Route}
          className="flex min-w-0 flex-col gap-3 [touch-action:manipulation]"
        >
          {kropp}
        </Link>
      </div>
    );
  }
  return (
    <Link
      href={href as Route}
      data-pulse-kort={navn ?? 'hero'}
      data-verkstedet-hero={variant === 'hero' ? '' : undefined}
      className={`${fyll} flex min-h-11 w-full flex-col gap-3 p-5 [touch-action:manipulation]`}
    >
      {kropp}
    </Link>
  );
}

/**
 * Endringer — mørk tile-knapp (Claude-designet). Ink-CTA, aldri #0066ff.
 * Mobil (Mobile.dc): fast 138×37, 400 16px, gap 7px.
 */
export function PulseEndringerKnapp({
  className = '',
  mobil = false,
}: {
  className?: string;
  mobil?: boolean;
}) {
  return (
    <Link
      href={PULSE_ENDRINGER_HREF as Route}
      aria-label="Endringer"
      data-pulse-endringer
      data-pulse-ikon="Endringer"
      className={
        mobil
          ? `inline-flex h-[37px] w-[138px] shrink-0 items-center justify-center gap-[7px] rounded-[13px] bg-fg text-[16px] leading-none text-bg [touch-action:manipulation] ${className}`
          : `inline-flex h-[37px] shrink-0 items-center gap-2 rounded-[13px] bg-fg px-4 text-label text-bg [touch-action:manipulation] ${className}`
      }
    >
      <span>Endringer</span>
      <ArrowRight size={15} strokeWidth={mobil ? 2 : 1.75} aria-hidden />
    </Link>
  );
}

/**
 * Avvik og Forespørsler — én segmentert boks (Claude-designet):
 * rød trekant + avvik | skille | gult spørsmål + forespørsler.
 */
export function PulseAvvikForesporBoks({
  avvik,
  forespor,
  laster = false,
  mobil = false,
}: {
  avvik: number;
  forespor: number;
  laster?: boolean;
  /** Mobile.dc: 400 16px-tall, ikon-stroke 1.9, chip-kant (border-border). */
  mobil?: boolean;
}) {
  return (
    <fieldset
      data-pulse-avvik-boks
      className={`m-0 flex h-[37px] w-max min-w-0 items-stretch overflow-hidden rounded-[13px] border p-0 ${
        mobil ? 'border-border' : 'border-divide'
      }`}
    >
      <legend className="sr-only">{`Avvik ${avvik}, Forespørsler ${forespor}`}</legend>
      <Link
        href={PULSE_AVVIK_HREF as Route}
        data-pulse-avvik-felt
        className="inline-flex min-w-0 items-center gap-1.5 px-3 [touch-action:manipulation]"
      >
        <TriangleAlert
          size={16}
          strokeWidth={mobil ? 1.9 : 1.6}
          className="text-danger"
          aria-hidden
        />
        <span
          data-pulse-avvik-tall
          className={`leading-none text-danger tabular-nums ${
            mobil ? 'text-[16px]' : 'text-[15px] font-medium'
          }`}
        >
          {laster ? '·' : avvik}
        </span>
      </Link>
      <span className={`w-px self-stretch ${mobil ? 'bg-border' : 'bg-divide'}`} aria-hidden />
      <Link
        href={PULSE_FORESPORSEL_HREF as Route}
        data-pulse-forespor-felt
        className="inline-flex min-w-0 items-center gap-1.5 px-3 [touch-action:manipulation]"
      >
        <CircleQuestionMark
          size={16}
          strokeWidth={mobil ? 1.9 : 1.6}
          className="text-warn"
          aria-hidden
        />
        <span
          data-pulse-forespor-tall
          className={`leading-none text-warn tabular-nums ${
            mobil ? 'text-[16px]' : 'text-[15px] font-medium'
          }`}
        >
          {laster ? '·' : forespor}
        </span>
      </Link>
    </fieldset>
  );
}

/**
 * Dagsfremgang — kun Amicro-halvsirkel (`DitherDonutChart` + sweep π).
 * Ink-fyll for hvor full dagen er. Ingen `#0066ff`. Ingen ekstra SVG-strek/nål.
 * Fot `08.00` / `19.00`.
 */
export function PulseDagSirkel({
  startHour = PULSE_DAG_START,
  sluttHour = PULSE_DAG_SLUTT,
  naa,
}: {
  startHour?: number;
  sluttHour?: number;
  /** Fast klokke (preview). Tom = live Oslo-tid. */
  naa?: Date;
}) {
  const [andel, setAndel] = useState(
    () => dagFremgang(naa ?? new Date(), startHour, sluttHour).andel,
  );

  useEffect(() => {
    function tick() {
      const d = dagFremgang(naa ?? new Date(), startHour, sluttHour);
      setAndel(d.andel);
    }
    tick();
    if (naa) return;
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [startHour, sluttHour, naa]);

  const startLabel = fmtPulseKlokke(startHour);
  const sluttLabel = fmtPulseKlokke(sluttHour);
  const startKort = fmtPulseTime(startHour);
  const sluttKort = fmtPulseTime(sluttHour);
  const passert = Math.max(0.001, andel);
  const igjen = Math.max(0.001, 1 - andel);

  return (
    <div
      data-pulse-dag-sirkel
      data-pulse-dag-halvsirkel
      className="flex w-[148px] shrink-0 flex-col"
    >
      <div
        className="pointer-events-none relative h-[78px] min-h-[78px] w-full shrink-0 overflow-hidden"
        role="img"
        aria-label={`Verksteddagen ${startLabel}–${sluttLabel}`}
      >
        <div className="absolute inset-x-0 top-0 h-[148px] w-full" data-pulse-dag-dither>
          <DitherDonutChart
            compact
            className="size-full"
            startAngle={PULSE_DAG_BUE_START}
            sweep={PULSE_DAG_BUE_SWEEP}
            slices={[
              { name: 'passert', value: passert, color: PULSE_DAG_FYLL_INK },
              { name: 'igjen', value: igjen, color: PULSE_DAG_FYLL_SOFT },
            ]}
          />
        </div>
      </div>
      <div
        data-pulse-dag-fot
        className="flex h-[16px] w-full items-end justify-between text-[13px] leading-none text-fg-muted tabular-nums"
      >
        <span data-pulse-dag-start>{startKort}</span>
        <span data-pulse-dag-slutt>{sluttKort}</span>
      </div>
    </div>
  );
}

/**
 * Dagsfremgang på mobil (Claude-designet, Mobile.dc): prikk-halvsirkel
 * 132×66 med dynamisk fylt andel + nål. Prikker er `fg` på 16 % (igjen) og
 * 68 % (passert) — ingen Amicro-dither, ingen #0066ff. Fot `08.00`/`19.00`.
 */
export function PulseDagSirkelPrikk({
  startHour = PULSE_DAG_START,
  sluttHour = PULSE_DAG_SLUTT,
  naa,
}: {
  startHour?: number;
  sluttHour?: number;
  /** Fast klokke (preview). Tom = live Oslo-tid. */
  naa?: Date;
}) {
  const [andel, setAndel] = useState(
    () => dagFremgang(naa ?? new Date(), startHour, sluttHour).andel,
  );

  useEffect(() => {
    function tick() {
      const d = dagFremgang(naa ?? new Date(), startHour, sluttHour);
      setAndel(d.andel);
    }
    tick();
    if (naa) return;
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [startHour, sluttHour, naa]);

  const startLabel = fmtPulseKlokke(startHour);
  const sluttLabel = fmtPulseKlokke(sluttHour);
  const startKort = fmtPulseTime(startHour);
  const sluttKort = fmtPulseTime(sluttHour);
  const visFyll = andel > 0.001;
  const ytre = dagPrikkPunkt(andel, PULSE_DAG_PRIKK_R);
  const indre = dagPrikkPunkt(andel, PULSE_DAG_PRIKK_R_INDRE);
  const naalFra = dagPrikkPunkt(andel, PULSE_DAG_PRIKK_NAAL_FRA);
  const naalTil = dagPrikkPunkt(andel, PULSE_DAG_PRIKK_NAAL_TIL);
  const fyllBue =
    andel >= 0.999
      ? 'M2 66 A64 64 0 0 1 130 66 L104 66 A38 38 0 0 0 28 66 Z'
      : `M2 66 A64 64 0 0 1 ${ytre.x.toFixed(2)} ${ytre.y.toFixed(2)} L${indre.x.toFixed(2)} ${indre.y.toFixed(2)} A38 38 0 0 0 28 66 Z`;

  return (
    <div data-pulse-dag-sirkel className="flex w-[138px] shrink-0 flex-col items-center gap-0.5">
      <svg
        data-pulse-dag-prikk
        width="132"
        height="66"
        viewBox="0 0 132 66"
        role="img"
        aria-label={`Verksteddagen ${startLabel}–${sluttLabel}`}
        className="block h-[66px] w-[132px]"
      >
        <defs>
          <pattern id="ew-dots" width="4" height="4" patternUnits="userSpaceOnUse">
            <circle cx="1.4" cy="1.4" r="1.05" fill="var(--color-fg)" fillOpacity="0.16" />
          </pattern>
          <pattern id="ew-dots-on" width="4" height="4" patternUnits="userSpaceOnUse">
            <circle cx="1.4" cy="1.4" r="1.15" fill="var(--color-fg)" fillOpacity="0.68" />
          </pattern>
        </defs>
        <path d="M2 66 A64 64 0 0 1 130 66 L104 66 A38 38 0 0 0 28 66 Z" fill="url(#ew-dots)" />
        {visFyll ? <path data-pulse-dag-prikk-fyll d={fyllBue} fill="url(#ew-dots-on)" /> : null}
        <line
          data-pulse-dag-prikk-utvisk
          x1={naalFra.x.toFixed(2)}
          y1={naalFra.y.toFixed(2)}
          x2={naalTil.x.toFixed(2)}
          y2={naalTil.y.toFixed(2)}
          stroke="var(--color-bg)"
          strokeWidth="6.5"
          strokeLinecap="round"
        />
        <line
          data-pulse-dag-prikk-naal
          x1={naalFra.x.toFixed(2)}
          y1={naalFra.y.toFixed(2)}
          x2={naalTil.x.toFixed(2)}
          y2={naalTil.y.toFixed(2)}
          stroke="var(--color-fg)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <div
        data-pulse-dag-fot
        className="flex w-full items-end justify-between text-[14px] leading-none text-fg-muted tabular-nums"
      >
        <span data-pulse-dag-start>{startKort}</span>
        <span data-pulse-dag-slutt>{sluttKort}</span>
      </div>
    </div>
  );
}

/**
 * Toppkort (Claude-designet): stor dato-tittel · 3 stats mot buehøyde ·
 * segmentert avvik/forespørsler + mørk Endringer-knapp nederst.
 */
export function PulseHeroFlate({
  ukedag,
  dato,
  planlagt,
  paagaar,
  ferdig,
  lasterJobber,
  avvik = 0,
  forespor = 0,
  lasterEndringer = false,
  href,
  sirkelNaa,
}: {
  ukedag: string;
  dato: string;
  planlagt: number;
  paagaar: number;
  ferdig: number;
  lasterJobber: boolean;
  avvik?: number;
  forespor?: number;
  lasterEndringer?: boolean;
  href: string;
  sirkelNaa?: Date;
}) {
  return (
    <div
      data-pulse-kort="hero"
      data-verkstedet-hero=""
      data-pulse-hero-todelt
      className={`${PULSE_MOBIL_HERO_FYLL} relative flex min-h-11 w-full flex-col px-5 pt-2.5 pb-4`}
    >
      <div data-pulse-hero-topp className="mt-3.5 flex items-end justify-between gap-3">
        <Link
          href={href as Route}
          data-pulse-del="1"
          className="flex min-w-0 flex-col [touch-action:manipulation]"
        >
          <p className="mb-5 whitespace-nowrap text-[17px] leading-none text-fg">
            <span data-pulse-ukedag className="text-[20px] font-bold">
              {ukedag}
            </span>{' '}
            <span data-pulse-dato className="font-normal text-fg-muted">
              {dato}
            </span>
          </p>
          <div data-pulse-teller-rad className="flex gap-4">
            <PulseTallStor label="Planlagt" verdi={planlagt} laster={lasterJobber} />
            <PulseTallStor label="Pågår" verdi={paagaar} laster={lasterJobber} />
            <PulseTallStor label="Ferdig" verdi={ferdig} laster={lasterJobber} />
          </div>
        </Link>
        <div data-pulse-del="2" className="shrink-0">
          <PulseDagSirkelPrikk naa={sirkelNaa} />
        </div>
      </div>
      <div data-pulse-hero-bunn className="mt-[18px] flex w-full items-center gap-4">
        <PulseAvvikForesporBoks avvik={avvik} forespor={forespor} laster={lasterEndringer} mobil />
        <div className="flex-1" aria-hidden />
        <PulseEndringerKnapp mobil />
      </div>
    </div>
  );
}

/**
 * Hero-stat på mobil (Claude-designet): 700 38px siffer, 400 15px etikett,
 * sentrert — kolonnene er innholdsbredde i en flex-rad (ikke grid).
 */
export function PulseTallStor({
  label,
  verdi,
  laster,
}: {
  label: string;
  verdi: number;
  laster: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-end text-center">
      <p
        data-pulse-tall-siffer
        className="text-[38px] leading-none font-bold tracking-[-0.02em] text-fg tabular-nums"
      >
        {laster ? (
          <span className="inline-block h-[38px] w-9 animate-pulse rounded-sm bg-border" />
        ) : (
          verdi
        )}
      </p>
      <p data-pulse-tall-etikett className="mt-1.5 text-[15px] leading-[1.2] text-fg-muted">
        {label}
      </p>
    </div>
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
    <div className="flex min-w-0 flex-col items-center justify-end text-center">
      <p
        data-pulse-tall-siffer
        className="w-full text-[36px] leading-none font-semibold text-fg tabular-nums"
      >
        {laster ? (
          <span className="inline-block h-9 w-8 animate-pulse rounded-sm bg-border" />
        ) : (
          verdi
        )}
      </p>
      <p data-pulse-tall-etikett className="mt-1.5 text-[13px] leading-4 text-fg-muted">
        {label}
      </p>
    </div>
  );
}

/**
 * Kvadratisk ikon-tile (Claude-designet: 46×46, radius 14).
 * Standard: alltid hvit, også i mørk modus (desktop-hjem).
 * `mork`: Mobile.dc-tile — ink-flate med lyst ikon (telefon-hjem).
 */
export function PulseIkonFlate({
  children,
  mork = false,
}: {
  children: ReactNode;
  mork?: boolean;
}) {
  if (mork) {
    return (
      <span
        data-pulse-ikonboks
        data-pulse-ikonboks-mork
        className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px] border border-fg bg-fg text-bg shadow-none"
      >
        {children}
      </span>
    );
  }
  return (
    <span
      data-pulse-ikonboks
      className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px] text-[#141414] shadow-none ring-1 ring-divide"
      style={{ backgroundColor: WHITE }}
    >
      {children}
    </span>
  );
}

/** Amicro dither under tallene — Mobbin-ink. */
export function PulseUkeSpark({ verdier }: { verdier: number[] }) {
  return (
    <div data-pulse-spark className="h-14 w-full overflow-hidden rounded-[16px]" aria-hidden>
      <DitherGrowthChart
        compact
        className="h-full w-full"
        values={verdier}
        labels={verdier.map((_, i) => String(i + 1))}
        color={PULSE_SPARK_INK}
      />
    </div>
  );
}

/** @deprecated Bruk PulseUkeSpark. */
export function Pulse30dSpark({ verdier }: { verdier: number[] }) {
  return <PulseUkeSpark verdier={verdier} />;
}

/**
 * Én-linjes radkort (Claude-designet): kvadratisk ikon-tile · tittel ·
 * teller · hale-pil. Ingen mini-stats / trend. Ingen mock-badge.
 */
export function PulseRadKort({
  href,
  ikon: Ikon,
  tittel,
  teller,
  laster = false,
  kompakt = false,
  mobil = false,
}: {
  href: string;
  ikon: LucideIcon;
  tittel: string;
  teller?: string | number;
  mock?: boolean;
  laster?: boolean;
  /** Par-flis: skjul pil så 50/50-sporet ikke sprekker. */
  kompakt?: boolean;
  /** Mobile.dc: 22px kort, mørk tile, 400 17px etikett, pil i fg. */
  mobil?: boolean;
}) {
  if (mobil) {
    return (
      <Link
        href={href as Route}
        data-pulse-rad={tittel}
        className={`${PULSE_MOBIL_DEST_FYLL} flex h-full min-h-11 w-full min-w-0 items-center overflow-hidden [touch-action:manipulation] ${
          kompakt ? 'gap-2.5 py-2.5 pr-3.5 pl-2.5' : 'gap-3.5 py-2.5 pr-5 pl-2.5'
        }`}
      >
        <PulseIkonFlate mork>
          <Ikon size={kompakt ? 23 : 24} strokeWidth={1.7} aria-hidden />
        </PulseIkonFlate>
        <span className="min-w-0 flex-1 truncate text-[17px] leading-[1.3] text-fg">{tittel}</span>
        <span className="shrink-0 text-[17px] font-medium leading-none text-fg tabular-nums">
          {laster ? (
            <span className="inline-block h-4 w-6 animate-pulse rounded-sm bg-border" />
          ) : (
            teller
          )}
        </span>
        {kompakt ? null : (
          <ArrowRight size={15} strokeWidth={2} className="shrink-0 text-fg" aria-hidden />
        )}
      </Link>
    );
  }
  return (
    <Link
      href={href as Route}
      data-pulse-rad={tittel}
      className={`${PHONE_DEST_FYLL} flex h-full min-h-11 w-full min-w-0 items-center gap-3 overflow-hidden px-3 py-3 [touch-action:manipulation]`}
    >
      <PulseIkonFlate>
        <Ikon size={22} strokeWidth={1.75} aria-hidden />
      </PulseIkonFlate>
      <span className="min-w-0 flex-1 truncate text-body text-fg">{tittel}</span>
      <span className="shrink-0 text-body font-medium text-fg tabular-nums">
        {laster ? (
          <span className="inline-block h-4 w-6 animate-pulse rounded-sm bg-border" />
        ) : (
          teller
        )}
      </span>
      {kompakt ? null : (
        <ArrowRight size={16} strokeWidth={1.75} className="shrink-0 text-fg-muted" aria-hidden />
      )}
    </Link>
  );
}

/**
 * Ny Jobb — samme spor som På Jobb (50/50). Kun telefon.
 * Mobile.dc: 700 19px tittel til venstre, mørk tile-knapp (pluss) til høyre.
 */
export function PulseJobbFlis() {
  return (
    <Link
      href={'/bookinger/ny' as Route}
      data-pulse-jobb
      className={`${PULSE_MOBIL_DEST_FYLL} flex h-full min-h-14 w-full min-w-0 items-center justify-between gap-2.5 overflow-hidden py-2.5 pr-2.5 pl-5 text-fg [touch-action:manipulation]`}
    >
      <span className="min-w-0 truncate text-[19px] leading-none font-bold">Ny Jobb</span>
      <PulseIkonFlate mork>
        <Plus size={24} strokeWidth={1.9} aria-hidden />
      </PulseIkonFlate>
    </Link>
  );
}

/**
 * Analyse — Claude-designet: «Analyse» · «siste 30 dager» · «Alle tall →»,
 * uten ikonplate i header. Under: Visninger, Bookinger, Returer, Credits.
 * Kun Bookinger er live — resten ærlige «Ingen data»-stubber. Ingen dither.
 */
export function PulseAnalyserKort({
  stats,
  href,
  laster = false,
  mobil = false,
}: {
  stats: AnalyserMockStat[];
  href: string;
  forhandlerNavn?: string | null;
  laster?: boolean;
  /** Mobile.dc: 26px kort, 700 19px tittel, 700 22px tall, delta uten ikon. */
  mobil?: boolean;
}) {
  const kpis = stats.slice(0, 4);
  const en = kpis.length === 1;

  if (mobil) {
    return (
      <div
        data-pulse-analyser
        data-analyse-kort
        className={`${PULSE_MOBIL_KORT_FYLL} flex min-h-[148px] w-full flex-1 flex-col gap-2.5 px-5 py-3.5`}
      >
        <div className="flex w-full min-w-0 items-center gap-2.5">
          <p
            data-analyser-tittel
            className="text-[19px] leading-[1.2] font-bold tracking-[-0.01em] text-fg"
          >
            Analyse
          </p>
          <p data-analyser-periode className="truncate text-[15px] leading-none text-fg-muted">
            siste 30 dager
          </p>
          <Link
            href={href as Route}
            data-analyser-alle-tall
            data-analyser-se-tallene
            className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-[15px] leading-none text-fg-muted [touch-action:manipulation]"
          >
            Alle tall
            <ArrowRight size={14} strokeWidth={2} aria-hidden />
          </Link>
        </div>
        <div
          data-analyser-kpi-liste
          data-analyser-kpi-rutenett
          className={
            en
              ? 'border-t border-divide pt-3'
              : 'grid flex-1 grid-cols-2 content-between gap-x-[18px] gap-y-2.5 border-t border-divide pt-3'
          }
        >
          {kpis.map((s) => (
            <PulseAnalyseKpi key={s.id} stat={s} laster={laster && s.id === 'bookinger'} mobil />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      data-pulse-analyser
      data-analyse-kort
      className={`${PHONE_DEST_FYLL} flex w-full flex-col px-4 py-3.5`}
    >
      <div className="flex w-full min-w-0 items-baseline gap-2">
        <p data-analyser-tittel className="text-[18px] leading-6 font-semibold text-fg">
          Analyse
        </p>
        <p data-analyser-periode className="truncate text-meta leading-6 text-fg-muted">
          siste 30 dager
        </p>
        <Link
          href={href as Route}
          data-analyser-alle-tall
          data-analyser-se-tallene
          className="ml-auto inline-flex shrink-0 items-center gap-1 text-label leading-6 text-fg-muted [touch-action:manipulation]"
        >
          Alle tall
          <ArrowRight size={14} strokeWidth={1.75} aria-hidden />
        </Link>
      </div>
      <div
        data-analyser-kpi-liste
        data-analyser-kpi-rutenett
        className={
          en
            ? 'mt-2 border-t border-divide pt-3'
            : 'mt-2 grid grid-cols-2 gap-x-4 gap-y-3.5 border-t border-divide pt-3 md:grid-cols-4'
        }
      >
        {kpis.map((s) => (
          <PulseAnalyseKpi key={s.id} stat={s} laster={laster && s.id === 'bookinger'} />
        ))}
      </div>
    </div>
  );
}

function PulseAnalyseKpi({
  stat,
  laster = false,
  mobil = false,
}: {
  stat: AnalyserMockStat;
  laster?: boolean;
  mobil?: boolean;
}) {
  const Ikon = stat.opp ? TrendingUp : TrendingDown;
  const verdi = typeof stat.verdi === 'number' ? stat.verdi.toLocaleString('nb-NO') : stat.verdi;
  const deaktivert = Boolean(stat.stub);
  if (mobil) {
    return (
      <div
        data-analyser-kpi={stat.id}
        data-analyser-deaktivert={deaktivert ? '' : undefined}
        aria-disabled={deaktivert || undefined}
        className={`flex min-w-0 flex-col gap-[3px] ${deaktivert ? 'opacity-50' : ''}`}
      >
        <p className="min-w-0 truncate text-[14px] leading-none text-fg-muted">{stat.label}</p>
        <div className="flex min-w-0 items-baseline gap-[7px]">
          {laster ? (
            <span className="inline-block h-[22px] w-8 animate-pulse rounded-sm bg-border" />
          ) : verdi !== '' ? (
            <p className="text-[22px] font-bold leading-none tracking-[-0.02em] text-fg tabular-nums">
              {verdi}
            </p>
          ) : null}
          {stat.stub ? (
            <span data-analyser-stub className="truncate text-[13px] leading-none text-fg-faint">
              {stat.stub}
            </span>
          ) : stat.delta ? (
            <span
              data-analyser-delta={stat.opp ? 'opp' : 'ned'}
              className={`text-[13px] font-medium leading-none tabular-nums ${
                stat.opp ? 'text-success' : 'text-danger'
              }`}
            >
              {stat.delta}
            </span>
          ) : null}
        </div>
      </div>
    );
  }
  return (
    <div
      data-analyser-kpi={stat.id}
      data-analyser-deaktivert={deaktivert ? '' : undefined}
      aria-disabled={deaktivert || undefined}
      className={`flex min-w-0 flex-col gap-1 ${deaktivert ? 'opacity-50' : ''}`}
    >
      <p className="min-w-0 truncate text-[13px] leading-4 text-fg-muted">{stat.label}</p>
      <div className="flex min-w-0 items-center gap-1.5">
        {laster ? (
          <span className="inline-block h-5 w-8 animate-pulse rounded-sm bg-border" />
        ) : verdi !== '' ? (
          <p className="text-[24px] font-semibold leading-none text-fg tabular-nums">{verdi}</p>
        ) : null}
        {stat.stub ? (
          <span data-analyser-stub className="truncate text-[13px] leading-none text-fg-faint">
            {stat.stub}
          </span>
        ) : stat.delta ? (
          <span
            data-analyser-delta={stat.opp ? 'opp' : 'ned'}
            className={`inline-flex items-center gap-0.5 text-[13px] leading-none tabular-nums ${
              stat.opp ? 'text-success' : 'text-danger'
            }`}
          >
            <Ikon size={11} strokeWidth={2} aria-hidden />
            {stat.delta}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Bunntekst på forhandler-hjem (Claude-designet). */
export function PulseBunntekst() {
  return (
    <p data-pulse-bunntekst className="pb-8 pt-2 text-center text-meta text-fg-muted">
      <span className="font-semibold text-fg">Endwise</span> levert av TwoFold
    </p>
  );
}

/**
 * Bunntekst nederst på enhver telefon-side (Claude-designet: alle skjermer
 * avsluttes med «Endwise levert av TwoFold»). Kun telefon — desktop urørt.
 */
export function MobilSideBunn() {
  return (
    <div data-mobil-side-bunn className="mt-auto pt-2 md:hidden">
      <PulseBunntekst />
    </div>
  );
}
