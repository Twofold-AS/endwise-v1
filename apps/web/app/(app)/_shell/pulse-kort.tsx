'use client';

import {
  ArrowUpRight,
  Badge,
  ChevronRight,
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
  dagBuePunkt,
  dagFremgang,
  fmtPulseKlokke,
  fmtPulseTime,
  PULSE_DAG_BUE_CX,
  PULSE_DAG_BUE_CY,
  PULSE_DAG_BUE_R,
  PULSE_DAG_BUE_START,
  PULSE_DAG_BUE_SWEEP,
  PULSE_DAG_FREMGANG_BLA,
  PULSE_DAG_SLUTT,
  PULSE_DAG_START,
} from './phone-home-pulse';

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
 * Endringer — hvit knapp, tekst + høyre-pil.
 * Samme linje som Avvik/Forespørsler-boksen.
 */
export function PulseEndringerLenke() {
  return (
    <Link
      href={PULSE_ENDRINGER_HREF as Route}
      aria-label="Endringer"
      data-pulse-endringer
      data-pulse-ikon="Endringer"
      className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-[16px] px-3.5 text-[#141414] shadow-none ring-1 ring-divide [touch-action:manipulation]"
      style={{ backgroundColor: WHITE }}
    >
      <span className="text-[15px] font-[650]">Endringer</span>
      <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
    </Link>
  );
}

/**
 * Avvik | Forespørsler — visningstall, ikke knapper.
 * Samme plate som Modus (`.ew-modus-plate` / valgknapp-look).
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
      className="ew-modus-plate m-0 flex min-h-11 min-w-0 flex-1 items-stretch overflow-hidden rounded-full border-0 p-0.5 ring-1 ring-divide"
    >
      <legend className="sr-only">{`Avvik ${avvik}, Forespørsler ${forespor}`}</legend>
      <div
        data-pulse-avvik-felt
        className="flex min-w-0 flex-1 items-center justify-center gap-1.5 px-2 text-fg"
      >
        <TriangleAlert size={16} strokeWidth={1.75} aria-hidden />
        <span data-pulse-avvik-tall className="text-[15px] font-[650] tabular-nums">
          {laster ? '·' : avvik}
        </span>
      </div>
      <div className="w-px shrink-0 self-stretch bg-divide" aria-hidden />
      <div
        data-pulse-forespor-felt
        className="flex min-w-0 flex-1 items-center justify-center gap-1.5 px-2 text-fg"
      >
        <CircleQuestionMark size={16} strokeWidth={1.75} aria-hidden />
        <span data-pulse-forespor-tall className="text-[15px] font-[650] tabular-nums">
          {laster ? '·' : forespor}
        </span>
      </div>
    </fieldset>
  );
}

/**
 * Dagsfremgang — Amicro dither-halvsirkel (øvre bue) + blå fill-linje.
 * Fyller 08–19 Oslo, klokkevis fra venstre mot høyre. Klokke i midten.
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
  const [andel, setAndel] = useState(0);
  const [naaLabel, setNaaLabel] = useState<string | null>(null);

  useEffect(() => {
    function tick() {
      const d = dagFremgang(naa ?? new Date(), startHour, sluttHour);
      setAndel(d.andel);
      setNaaLabel(d.naaLabel);
    }
    tick();
    if (naa) return;
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [startHour, sluttHour, naa]);

  const startLabel = fmtPulseKlokke(startHour);
  const sluttLabel = fmtPulseKlokke(sluttHour);
  const startKort = fmtPulseTime(startHour);
  const sluttKort = fmtPulseTime(sluttHour);
  const passert = Math.max(0.001, andel);
  const igjen = Math.max(0.001, 1 - andel);
  const bue = Math.PI * PULSE_DAG_BUE_R;
  const fyll = bue * andel;
  const naal = dagBuePunkt(andel);

  return (
    <div data-pulse-dag-sirkel data-pulse-dag-halvsirkel className="flex w-[148px] flex-col">
      <div
        className="relative h-[78px] w-full overflow-hidden"
        role="img"
        aria-label={`Verksteddagen ${startLabel}–${sluttLabel}${naaLabel ? `, klokken ${naaLabel}` : ''}`}
      >
        <div className="absolute inset-x-0 top-0 h-[148px] w-full">
          <DitherDonutChart
            compact
            className="size-full"
            startAngle={PULSE_DAG_BUE_START}
            sweep={PULSE_DAG_BUE_SWEEP}
            slices={[
              { name: 'passert', value: passert, color: PULSE_DAG_FREMGANG_BLA },
              { name: 'igjen', value: igjen, color: '#e0e0e0' },
            ]}
          />
          <svg
            data-pulse-dag-fyll
            className="pointer-events-none absolute inset-0 size-full"
            viewBox="0 0 148 148"
            aria-hidden
          >
            <title>Dagsfremgang</title>
            <path
              d={`M ${PULSE_DAG_BUE_CX - PULSE_DAG_BUE_R} ${PULSE_DAG_BUE_CY} A ${PULSE_DAG_BUE_R} ${PULSE_DAG_BUE_R} 0 0 1 ${PULSE_DAG_BUE_CX + PULSE_DAG_BUE_R} ${PULSE_DAG_BUE_CY}`}
              fill="none"
              stroke="#e0e0e0"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d={`M ${PULSE_DAG_BUE_CX - PULSE_DAG_BUE_R} ${PULSE_DAG_BUE_CY} A ${PULSE_DAG_BUE_R} ${PULSE_DAG_BUE_R} 0 0 1 ${PULSE_DAG_BUE_CX + PULSE_DAG_BUE_R} ${PULSE_DAG_BUE_CY}`}
              fill="none"
              stroke={PULSE_DAG_FREMGANG_BLA}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${fyll} ${bue}`}
            />
            <circle
              cx={naal.x}
              cy={naal.y}
              r="5"
              fill={PULSE_DAG_FREMGANG_BLA}
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          </svg>
        </div>
        {naaLabel ? (
          <time
            data-pulse-dag-naa
            dateTime={naaLabel}
            className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-[15px] font-[650] leading-none text-fg tabular-nums"
          >
            {naaLabel}
          </time>
        ) : null}
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
        className="flex min-w-0 flex-col [touch-action:manipulation]"
      >
        <div data-pulse-teller-rad className="flex w-full items-end gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <p data-pulse-ukedag className="text-title text-fg">
              {ukedag}{' '}
              <span data-pulse-dato className="text-title text-fg-muted">
                {dato}
              </span>
            </p>
            <div className="grid min-w-0 grid-cols-3 divide-x divide-divide">
              <PulseTall label="Planlagt" verdi={planlagt} laster={lasterJobber} />
              <PulseTall label="Pågår" verdi={paagaar} laster={lasterJobber} />
              <PulseTall label="Ferdig" verdi={ferdig} laster={lasterJobber} />
            </div>
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
 * Analyser — to deler nederst i hjem-stakken (under Innboks/Lager/Jobb).
 * Del 1: tittel + Se tall. Del 2: dither-rutenett (nettsidevisninger, mock).
 */
export function PulseAnalyserKort({ stats, href }: { stats: AnalyserMockStat[]; href: string }) {
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
