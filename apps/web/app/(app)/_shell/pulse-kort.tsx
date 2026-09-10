'use client';

import {
  ArrowUpRight,
  Badge,
  CircleQuestionMark,
  DitherDonutChart,
  DitherGrowthChart,
  type LucideIcon,
  Plus,
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
  PULSE_DAG_FYLL_HAIRLINE,
  PULSE_DAG_FYLL_INK,
  PULSE_DAG_FYLL_SOFT,
  PULSE_DAG_SLUTT,
  PULSE_DAG_START,
} from './phone-home-pulse';

const WHITE = '#ffffff';

function halvBue(cx: number, cy: number, r: number, a0: number, a1: number) {
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

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
 * Avvik | Forespørsler — samme plate som Modus i profil (`ew-modus-plate` + p-0.5 + h-7).
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
      data-pulse-hero-bunn
      className="ew-modus-plate m-0 inline-flex min-w-0 flex-1 items-center overflow-hidden rounded-full border-0 p-0.5"
    >
      <legend className="sr-only">{`Avvik ${avvik}, Forespørsler ${forespor}`}</legend>
      <div
        data-pulse-avvik-felt
        className="inline-flex h-7 min-w-0 flex-1 items-center justify-center gap-1.5 px-2 text-fg"
      >
        <TriangleAlert size={14} strokeWidth={1.6} aria-hidden />
        <span data-pulse-avvik-tall className="text-label font-normal tabular-nums">
          {laster ? '·' : avvik}
        </span>
      </div>
      <div className="h-7 w-px shrink-0 bg-divide" aria-hidden />
      <div
        data-pulse-forespor-felt
        className="inline-flex h-7 min-w-0 flex-1 items-center justify-center gap-1.5 px-2 text-fg"
      >
        <CircleQuestionMark size={14} strokeWidth={1.6} aria-hidden />
        <span data-pulse-forespor-tall className="text-label font-normal tabular-nums">
          {laster ? '·' : forespor}
        </span>
      </div>
    </fieldset>
  );
}

/**
 * Dagsfremgang — Amicro dither-halvsirkel (øvre bue), Mobbin ink/hairline/soft.
 * Ingen midt-klokke, ingen blå fill-linje/nål. Fot `08.00` / `19.00`.
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
  const passert = Math.max(0.18, andel);
  const igjen = Math.max(0.12, 1 - andel);
  const cx = 74;
  const cy = 74;
  const r = 58;
  const a0 = PULSE_DAG_BUE_START;
  const a1 = a0 + PULSE_DAG_BUE_SWEEP;
  const aInk = a0 + Math.min(1, Math.max(0.12, andel)) * PULSE_DAG_BUE_SWEEP;

  return (
    <div data-pulse-dag-sirkel data-pulse-dag-halvsirkel className="flex w-[148px] flex-col">
      <div
        className="relative h-[78px] w-full overflow-hidden"
        role="img"
        aria-label={`Verksteddagen ${startLabel}–${sluttLabel}`}
      >
        <svg
          viewBox="0 0 148 148"
          className="absolute inset-x-0 top-0 h-[148px] w-full"
          role="presentation"
          aria-hidden
        >
          <path
            d={halvBue(cx, cy, r, a0, a1)}
            fill="none"
            stroke={PULSE_DAG_FYLL_SOFT}
            strokeWidth="22"
            strokeLinecap="butt"
          />
          <path
            d={halvBue(cx, cy, r, a0, a1)}
            fill="none"
            stroke={PULSE_DAG_FYLL_HAIRLINE ?? '#e0e0e0'}
            strokeWidth="16"
            strokeLinecap="butt"
          />
          <path
            d={halvBue(cx, cy, r, a0, aInk)}
            fill="none"
            stroke={PULSE_DAG_FYLL_INK}
            strokeWidth="16"
            strokeLinecap="butt"
          />
        </svg>
        <div className="absolute inset-x-0 top-0 h-[148px] w-full" data-pulse-dag-dither>
          <DitherDonutChart
            compact
            className="size-full"
            startAngle={PULSE_DAG_BUE_START}
            sweep={PULSE_DAG_BUE_SWEEP}
            slices={[
              { name: 'passert', value: passert, color: PULSE_DAG_FYLL_INK },
              { name: 'igjen', value: igjen, color: PULSE_DAG_FYLL_HAIRLINE ?? '#e0e0e0' },
              { name: 'bunn', value: 0.001, color: PULSE_DAG_FYLL_SOFT },
            ]}
          />
        </div>
      </div>
      <div className="-mt-1 flex w-full justify-between text-[12px] text-fg-muted tabular-nums">
        <span data-pulse-dag-start>{startKort}</span>
        <span data-pulse-dag-slutt>{sluttKort}</span>
      </div>
    </div>
  );
}

/**
 * Toppkort: ukedag+dato · PPF + halvsirkel · Avvik/Forespørsler-boks + Endringer.
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
      <Link
        href={href as Route}
        data-pulse-del="1"
        className="flex min-w-0 flex-col gap-3 [touch-action:manipulation]"
      >
        <p data-pulse-ukedag className="text-label font-normal text-fg">
          {ukedag}{' '}
          <span data-pulse-dato className="text-label font-normal text-fg-muted">
            {dato}
          </span>
        </p>
        <div data-pulse-teller-rad className="flex w-full items-end gap-3">
          <div className="grid min-w-0 flex-1 grid-cols-3 divide-x divide-divide">
            <PulseTall label="Planlagt" verdi={planlagt} laster={lasterJobber} />
            <PulseTall label="Pågår" verdi={paagaar} laster={lasterJobber} />
            <PulseTall label="Ferdig" verdi={ferdig} laster={lasterJobber} />
          </div>
          <div data-pulse-del="2" className="shrink-0 self-end">
            <PulseDagSirkel naa={sirkelNaa} />
          </div>
        </div>
      </Link>
      <div data-pulse-hero-bunn className="flex w-full items-center gap-3">
        <PulseAvvikForesporBoks avvik={avvik} forespor={forespor} laster={lasterEndringer} />
        <PulseEndringerLenke />
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
 * Analyser — 50/50 venstre | høyre, over Jobb / På jobb.
 * Venstre: Tall for «forhandler» + Alle tall-lenke. Høyre: zoomet dither, ingen tittel.
 */
export function PulseAnalyserKort({
  stats,
  href,
  forhandlerNavn,
}: {
  stats: AnalyserMockStat[];
  href: string;
  forhandlerNavn?: string | null;
}) {
  const navn = forhandlerNavn?.trim() || 'forhandleren';
  const rutenett = stats.slice(0, 2);
  const vekst = stats.find((s) => s.opp)?.delta ?? '+12 %';

  return (
    <div
      data-pulse-analyser
      className={`${PHONE_DEST_FYLL} flex min-h-[168px] w-full overflow-hidden`}
    >
      <div
        data-analyser-del="1"
        className="flex min-w-0 flex-1 basis-0 flex-col justify-center gap-2 px-4 py-4"
      >
        <p className="text-title text-fg">{`Tall for «${navn}»`}</p>
        <Link
          href={href as Route}
          data-analyser-alle-tall
          className="inline-flex items-center gap-1 text-label font-normal text-fg [touch-action:manipulation]"
        >
          Alle tall
          <ArrowUpRight size={16} strokeWidth={1.75} className="text-fg-muted" aria-hidden />
        </Link>
      </div>
      <div
        data-analyser-del="2"
        className="relative min-h-[168px] min-w-0 flex-1 basis-0 overflow-hidden border-divide border-l"
      >
        <div className="absolute -inset-8 grid scale-[1.65] grid-cols-2 gap-1" aria-hidden>
          {rutenett.map((s) => (
            <div key={s.id} data-analyser-stat={s.id} className="min-h-0 overflow-hidden">
              <DitherGrowthChart
                compact
                className="h-full min-h-[90px] w-full"
                values={s.serie}
                labels={s.serie.map((_, i) => String(i + 1))}
                color={PULSE_SPARK_INK}
              />
            </div>
          ))}
        </div>
        <Badge
          data-analyser-vekst
          variant="default"
          className="absolute top-2 right-2 border-transparent bg-success-soft text-success"
        >
          {vekst}
        </Badge>
      </div>
    </div>
  );
}
