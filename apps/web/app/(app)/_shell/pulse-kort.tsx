'use client';

import {
  ArrowUpRight,
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
import { PHONE_DEST_FYLL, PHONE_HERO_FYLL, PULSE_ENDRINGER_HREF } from './phone-home';
import {
  type AnalyserMockStat,
  dagFremgang,
  fmtPulseKlokke,
  fmtPulseTime,
  PULSE_DAG_BUE_START,
  PULSE_DAG_BUE_SWEEP,
  PULSE_DAG_FYLL_BLA,
  PULSE_DAG_FYLL_HAIRLINE,
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
      {meta ? <p className="text-[12px] text-fg-muted leading-snug">{meta}</p> : null}
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
 * Endringer — lenke som Innboks-raden: text-label, ikke fet, hale-pil høyre.
 */
export function PulseEndringerLenke() {
  return (
    <Link
      href={PULSE_ENDRINGER_HREF as Route}
      aria-label="Endringer"
      data-pulse-endringer
      data-pulse-ikon="Endringer"
      className="inline-flex shrink-0 items-center gap-1 text-label font-normal text-fg [touch-action:manipulation]"
    >
      <span>Endringer</span>
      <ArrowUpRight size={16} strokeWidth={1.75} className="text-fg-muted" aria-hidden />
    </Link>
  );
}

/**
 * Avvik og Forespørsler — to separate Modus-sirkler + tall ved siden.
 * Ikke én avrundet boks med loddrett skille. Samlet maks 50 % av raden.
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
      className="m-0 flex w-max max-w-[50%] min-w-0 items-center gap-2 border-0 p-0"
    >
      <legend className="sr-only">{`Avvik ${avvik}, Forespørsler ${forespor}`}</legend>
      <div data-pulse-avvik-felt className="inline-flex min-w-0 items-center gap-1.5">
        <span
          data-pulse-modus-ikon="avvik"
          className="ew-modus-plate inline-flex items-center rounded-full p-0.5"
        >
          <span className="inline-flex size-7 h-7 w-7 items-center justify-center text-fg">
            <span className="inline-flex size-6 items-center justify-center rounded-full">
              <TriangleAlert size={14} strokeWidth={1.6} aria-hidden />
            </span>
          </span>
        </span>
        <span data-pulse-avvik-tall className="text-label font-normal tabular-nums">
          {laster ? '·' : avvik}
        </span>
      </div>
      <div data-pulse-forespor-felt className="inline-flex min-w-0 items-center gap-1.5">
        <span
          data-pulse-modus-ikon="forespor"
          className="ew-modus-plate inline-flex items-center rounded-full p-0.5"
        >
          <span className="inline-flex size-7 h-7 w-7 items-center justify-center text-fg">
            <span className="inline-flex size-6 items-center justify-center rounded-full">
              <CircleQuestionMark size={14} strokeWidth={1.6} aria-hidden />
            </span>
          </span>
        </span>
        <span data-pulse-forespor-tall className="text-label font-normal tabular-nums">
          {laster ? '·' : forespor}
        </span>
      </div>
    </fieldset>
  );
}

/**
 * Dagsfremgang — kun Amicro-halvsirkel (`DitherDonutChart` + sweep π).
 * Blått `#0066ff`-fyll for hvor full dagen er. Ingen ekstra SVG-strek/nål.
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
              { name: 'passert', value: passert, color: PULSE_DAG_FYLL_BLA },
              { name: 'igjen', value: igjen, color: PULSE_DAG_FYLL_HAIRLINE },
            ]}
          />
        </div>
      </div>
      <div
        data-pulse-dag-fot
        className="flex h-[16px] w-full items-end justify-between text-[12px] leading-4 text-fg-muted tabular-nums"
      >
        <span data-pulse-dag-start>{startKort}</span>
        <span data-pulse-dag-slutt>{sluttKort}</span>
      </div>
    </div>
  );
}

/**
 * Toppkort: ukedag+dato og Endringer på samme rad ·
 * PPF-etiketter på samme linje som 08.00/19.00 · to Modus-sirkler nederst.
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
      className={`${PHONE_HERO_FYLL} relative flex min-h-11 w-full flex-col gap-2 p-3`}
    >
      <div data-pulse-hero-topp className="flex items-center justify-between gap-3">
        <Link
          href={href as Route}
          data-pulse-del="1"
          className="min-w-0 [touch-action:manipulation]"
        >
          <p data-pulse-ukedag className="text-label font-normal text-fg">
            {ukedag}{' '}
            <span data-pulse-dato className="text-label font-normal text-fg-muted">
              {dato}
            </span>
          </p>
        </Link>
        <PulseEndringerLenke />
      </div>
      <Link
        href={href as Route}
        data-pulse-teller-rad
        className="flex min-w-0 items-end gap-3 [touch-action:manipulation]"
      >
        <div className="grid min-w-0 flex-1 grid-cols-3 divide-x divide-divide">
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
    <div className="flex flex-col items-center justify-end gap-1 px-2 text-center first:pl-0 last:pr-0">
      <p className="text-[28px] font-semibold leading-none text-fg tabular-nums">
        {laster ? (
          <span className="inline-block h-7 w-8 animate-pulse rounded-sm bg-border" />
        ) : (
          verdi
        )}
      </p>
      <p data-pulse-tall-etikett className="h-[16px] text-[12px] leading-4 text-fg-muted">
        {label}
      </p>
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
      className={`${PHONE_DEST_FYLL} flex h-full min-h-14 w-full min-w-0 items-center justify-between gap-3 overflow-hidden px-3 py-3.5 text-fg [touch-action:manipulation]`}
    >
      <span className="min-w-0 truncate text-[15px] font-[650]">Jobb</span>
      <PulseIkonFlate>
        <Plus size={22} strokeWidth={1.75} aria-hidden />
      </PulseIkonFlate>
    </Link>
  );
}

/**
 * Analyser — to bokser loddrett, over Jobb / På jobb.
 * Øverst: «Analyse» (lett vekt) + «siste 30 dager» + Se tallene.
 * Under: fire KPI-tall med %-endring (grønn opp / rød ned). Ingen dither/Amicro.
 */
export function PulseAnalyserKort({
  stats,
  href,
}: {
  stats: AnalyserMockStat[];
  href: string;
  forhandlerNavn?: string | null;
}) {
  const kpis = stats.slice(0, 4);

  return (
    <div data-pulse-analyser className="flex w-full flex-col gap-2">
      <div
        data-analyser-del="1"
        className={`${PHONE_DEST_FYLL} flex min-h-0 w-full items-center justify-between gap-3 px-3 py-2`}
      >
        <div className="min-w-0">
          <p data-analyser-tittel className="text-body font-[300] leading-none text-fg">
            Analyse
          </p>
          <p data-analyser-periode className="mt-1 text-label font-normal text-fg-muted">
            siste 30 dager
          </p>
        </div>
        <Link
          href={href as Route}
          data-analyser-alle-tall
          data-analyser-se-tallene
          className="inline-flex shrink-0 items-center gap-1 text-label font-normal text-fg [touch-action:manipulation]"
        >
          Se tallene
          <ArrowUpRight size={16} strokeWidth={1.75} className="text-fg-muted" aria-hidden />
        </Link>
      </div>
      <div
        data-analyser-del="2"
        className={`${PHONE_DEST_FYLL} grid w-full grid-cols-2 gap-x-3 gap-y-1.5 px-3 py-2`}
      >
        {kpis.map((s) => (
          <PulseAnalyseKpi key={s.id} stat={s} />
        ))}
      </div>
    </div>
  );
}

function PulseAnalyseKpi({ stat }: { stat: AnalyserMockStat }) {
  const Ikon = stat.opp ? TrendingUp : TrendingDown;
  return (
    <div data-analyser-kpi={stat.id} className="min-w-0 py-0.5">
      <div className="flex items-baseline gap-1.5">
        <p className="text-[22px] font-semibold leading-none text-fg tabular-nums">{stat.verdi}</p>
        <span
          data-analyser-delta={stat.opp ? 'opp' : 'ned'}
          className={`inline-flex items-center gap-0.5 text-[12px] leading-none tabular-nums ${
            stat.opp ? 'text-success' : 'text-danger'
          }`}
        >
          <Ikon size={12} strokeWidth={2} aria-hidden />
          {stat.delta}
        </span>
      </div>
      <p className="mt-0.5 truncate text-[12px] leading-4 text-fg-muted">{stat.label}</p>
    </div>
  );
}
