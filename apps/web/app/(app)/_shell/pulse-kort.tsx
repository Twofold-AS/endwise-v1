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
} from './phone-home';
import {
  type AnalyserMockStat,
  dagFremgang,
  fmtPulseKlokke,
  fmtPulseTime,
  PULSE_DAG_BUE_START,
  PULSE_DAG_BUE_SWEEP,
  PULSE_DAG_FYLL_INK,
  PULSE_DAG_FYLL_SOFT,
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
 */
export function PulseEndringerKnapp({ className = '' }: { className?: string }) {
  return (
    <Link
      href={PULSE_ENDRINGER_HREF as Route}
      aria-label="Endringer"
      data-pulse-endringer
      data-pulse-ikon="Endringer"
      className={`inline-flex h-[37px] shrink-0 items-center gap-2 rounded-[13px] bg-fg px-4 text-label text-bg [touch-action:manipulation] ${className}`}
    >
      <span>Endringer</span>
      <ArrowRight size={15} strokeWidth={1.75} aria-hidden />
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
}: {
  avvik: number;
  forespor: number;
  laster?: boolean;
}) {
  return (
    <fieldset
      data-pulse-avvik-boks
      className="m-0 flex h-[37px] w-max min-w-0 items-stretch overflow-hidden rounded-[13px] border border-divide p-0"
    >
      <legend className="sr-only">{`Avvik ${avvik}, Forespørsler ${forespor}`}</legend>
      <Link
        href={PULSE_AVVIK_HREF as Route}
        data-pulse-avvik-felt
        className="inline-flex min-w-0 items-center gap-1.5 px-3 [touch-action:manipulation]"
      >
        <TriangleAlert size={16} strokeWidth={1.6} className="text-danger" aria-hidden />
        <span
          data-pulse-avvik-tall
          className="text-[15px] leading-none font-medium text-danger tabular-nums"
        >
          {laster ? '·' : avvik}
        </span>
      </Link>
      <span className="w-px self-stretch bg-divide" aria-hidden />
      <Link
        href={PULSE_FORESPORSEL_HREF as Route}
        data-pulse-forespor-felt
        className="inline-flex min-w-0 items-center gap-1.5 px-3 [touch-action:manipulation]"
      >
        <CircleQuestionMark size={16} strokeWidth={1.6} className="text-warn" aria-hidden />
        <span
          data-pulse-forespor-tall
          className="text-[15px] leading-none font-medium text-warn tabular-nums"
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
      className={`${PHONE_HERO_FYLL} relative flex min-h-11 w-full flex-col gap-3 p-4`}
    >
      <div data-pulse-hero-topp className="flex items-center justify-between gap-3">
        <Link
          href={href as Route}
          data-pulse-del="1"
          className="min-w-0 [touch-action:manipulation]"
        >
          <p data-pulse-ukedag className="text-[20px] leading-7 font-semibold text-fg">
            {ukedag}{' '}
            <span data-pulse-dato className="text-[17px] font-normal text-fg-muted">
              {dato}
            </span>
          </p>
        </Link>
      </div>
      <Link
        href={href as Route}
        data-pulse-teller-rad
        className="flex min-w-0 items-end gap-4 [touch-action:manipulation]"
      >
        <div className="grid min-w-0 flex-1 grid-cols-3">
          <PulseTall label="Planlagt" verdi={planlagt} laster={lasterJobber} />
          <PulseTall label="Pågår" verdi={paagaar} laster={lasterJobber} />
          <PulseTall label="Ferdig" verdi={ferdig} laster={lasterJobber} />
        </div>
        <div data-pulse-del="2" className="shrink-0 self-end">
          <PulseDagSirkel naa={sirkelNaa} />
        </div>
      </Link>
      <div data-pulse-hero-bunn className="flex w-full items-center justify-between gap-3">
        <PulseAvvikForesporBoks avvik={avvik} forespor={forespor} laster={lasterEndringer} />
        <PulseEndringerKnapp />
      </div>
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
 * Kvadratisk ikon-tile (Claude-designet: 46×46, radius 14) — alltid hvit,
 * også i mørk modus. Ikke `bg-card` / `bg-canvas` (de går mørke med tema).
 */
export function PulseIkonFlate({ children }: { children: ReactNode }) {
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

/** Ny Jobb — samme spor som På jobb (50/50). Claude-designet: fet tittel + tile. */
export function PulseJobbFlis() {
  return (
    <Link
      href={'/bookinger/ny' as Route}
      data-pulse-jobb
      className={`${PHONE_DEST_FYLL} flex h-full min-h-14 w-full min-w-0 items-center justify-between gap-3 overflow-hidden px-4 py-3 text-fg [touch-action:manipulation]`}
    >
      <span className="min-w-0 truncate text-[18px] font-semibold">Ny Jobb</span>
      <PulseIkonFlate>
        <Plus size={22} strokeWidth={1.75} aria-hidden />
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
}: {
  stats: AnalyserMockStat[];
  href: string;
  forhandlerNavn?: string | null;
  laster?: boolean;
}) {
  const kpis = stats.slice(0, 4);
  const en = kpis.length === 1;

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

function PulseAnalyseKpi({ stat, laster = false }: { stat: AnalyserMockStat; laster?: boolean }) {
  const Ikon = stat.opp ? TrendingUp : TrendingDown;
  const verdi = typeof stat.verdi === 'number' ? stat.verdi.toLocaleString('nb-NO') : stat.verdi;
  const deaktivert = Boolean(stat.stub);
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
