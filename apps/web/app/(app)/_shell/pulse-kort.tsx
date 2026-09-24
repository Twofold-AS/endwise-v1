'use client';

import {
  ArrowUpRight,
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
import { fmtDelta, fmtNorskTall } from './claude-tokens';
import {
  PHONE_DEST_FYLL,
  PHONE_HERO_FYLL,
  PHONE_KORT_META,
  PULSE_ENDRINGER_HREF,
} from './phone-home';
import type { TimeplanRad } from './phone-home-data';
import {
  dagFremgang,
  fmtPulseKlokke,
  fmtPulseTime,
  PULSE_DAG_BUE_START,
  PULSE_DAG_BUE_SWEEP,
  PULSE_DAG_FYLL_BLA,
  PULSE_DAG_FYLL_HAIRLINE,
  PULSE_DAG_SLUTT,
  PULSE_DAG_START,
  type TallCelle,
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
 * PPF-siffer sentrert mot buehøyde · etiketter på 08.00/19.00 · Modus nederst.
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
  spark,
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
  spark?: number[];
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
      {spark && spark.length > 0 ? (
        <div data-pulse-idag-spark className="pt-1">
          <PulseUkeSpark verdier={spark} />
        </div>
      ) : null}
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
    <div className="flex flex-col items-center justify-end px-2 text-center first:pl-0 last:pr-0">
      <div data-pulse-tall-siffer className="flex h-[78px] w-full items-center justify-center">
        <p className="text-[28px] font-semibold leading-none text-fg tabular-nums">
          {laster ? (
            <span className="inline-block h-7 w-8 animate-pulse rounded-sm bg-border" />
          ) : (
            verdi
          )}
        </p>
      </div>
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
      <span className="min-w-0 truncate text-[15px] font-normal">Jobb</span>
      <PulseIkonFlate>
        <Plus size={22} strokeWidth={1.75} aria-hidden />
      </PulseIkonFlate>
    </Link>
  );
}

const TALL_LABEL: Record<TallCelle['id'], string> = {
  visninger: 'Visninger',
  bookinger: 'Bookinger',
  returer: 'Returer',
  credits: 'Credits',
};

/**
 * Tall — Claude 2×2 (Visninger · Bookinger · Returer · Credits).
 * Erstatter Analyse/Analyser. `#0066ff` brukes ikke her.
 */
export function PulseTallKort({ celler, href }: { celler: TallCelle[]; href: string }) {
  return (
    <div data-pulse-tall className={`${PHONE_DEST_FYLL} flex w-full flex-col gap-2.5 px-5 py-4`}>
      <div className="flex min-w-0 items-center gap-2.5">
        <p
          data-tall-tittel
          className="text-[19px] font-[650] leading-none tracking-[-0.01em] text-fg"
        >
          Tall
        </p>
        <span data-tall-periode className="text-[15px] text-fg-muted">
          siste 30 dager
        </span>
        <Link
          href={href as Route}
          data-tall-alle
          className="ml-auto inline-flex shrink-0 items-center gap-1 text-[15px] text-fg-muted [touch-action:manipulation]"
        >
          Alle tall
          <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden />
        </Link>
      </div>
      <div
        data-tall-rutenett
        className="grid grid-cols-2 gap-x-[18px] gap-y-2.5 border-divide border-t pt-3"
      >
        {celler.map((c) => (
          <PulseTallCelle key={c.id} celle={c} />
        ))}
      </div>
    </div>
  );
}

function PulseTallCelle({ celle }: { celle: TallCelle }) {
  const delta = fmtDelta(celle.delta);
  const stub = celle.stub ?? (celle.verdi == null ? 'Ikke tilkoblet' : undefined);
  return (
    <div data-tall-celle={celle.id} className="flex min-w-0 flex-col gap-1">
      <span className="text-[14px] leading-none text-fg-muted">
        {celle.label || TALL_LABEL[celle.id]}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[22px] font-[650] leading-none tracking-[-0.02em] text-fg tabular-nums">
          {celle.verdi == null ? '—' : fmtNorskTall(celle.verdi)}
        </span>
        {delta ? (
          <span
            data-tall-delta={delta.opp ? 'opp' : 'ned'}
            className={`text-[13px] font-[500] leading-none tabular-nums ${
              delta.opp ? 'text-success' : 'text-danger'
            }`}
          >
            {delta.tekst}
          </span>
        ) : stub ? (
          <span className="text-[12px] text-fg-muted">{stub}</span>
        ) : null}
      </div>
    </div>
  );
}

export function PulseGulvKort({
  rader,
  laster,
  jobbHref = '/bookinger/ny',
}: {
  rader: TimeplanRad[];
  laster?: boolean;
  jobbHref?: string;
}) {
  return (
    <div data-pulse-gulv className={`${PHONE_DEST_FYLL} flex w-full flex-col px-4 py-3`}>
      <div className="flex items-center justify-between gap-3">
        <Link
          href={PHONE_KORT_META.timeplan.href as Route}
          className="min-w-0 text-label text-fg [touch-action:manipulation]"
        >
          Gulv
        </Link>
        <Link
          href={jobbHref as Route}
          data-pulse-jobb
          className="inline-flex h-8 items-center gap-1 rounded-full bg-fg px-3 text-[13px] font-[450] text-bg [touch-action:manipulation]"
        >
          <Plus size={14} strokeWidth={1.75} aria-hidden />
          Jobb
        </Link>
      </div>
      {laster ? (
        <p className="mt-2 text-[13px] text-fg-muted">Laster jobber …</p>
      ) : rader.length === 0 ? (
        <p className="mt-2 text-[13px] text-fg-muted">Ingen jobber i dag</p>
      ) : (
        <ul className="mt-2 flex flex-col">
          {rader.map((r) => (
            <li key={r.id}>
              <Link
                href={`/bookinger/${r.id}` as Route}
                data-pulse-gulv-rad={r.id}
                className="flex min-h-10 items-center justify-between gap-3 [touch-action:manipulation]"
              >
                <span className="text-[15px] tabular-nums text-fg">{r.time}</span>
                <span className="min-w-0 flex-1 truncate text-[15px] text-fg-muted">{r.what}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PulseSvarKort({ verdi, laster }: { verdi: string; laster?: boolean }) {
  return (
    <Link
      href={PHONE_KORT_META.svarhastighet.href as Route}
      data-pulse-svarhastighet
      className={`${PHONE_DEST_FYLL} flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 [touch-action:manipulation]`}
    >
      <span className="text-label text-fg">Svarhastighet</span>
      <span className="text-label tabular-nums text-fg">
        {laster ? (
          <span className="inline-block h-4 w-10 animate-pulse rounded-sm bg-border" />
        ) : (
          verdi || 'For lite data'
        )}
      </span>
    </Link>
  );
}

export function PulseTeamKort({
  medlemmer,
  laster,
}: {
  medlemmer: { id: string; name: string; paJobb: boolean }[];
  laster?: boolean;
}) {
  return (
    <Link
      href={PHONE_KORT_META.team.href as Route}
      data-pulse-team
      className={`${PHONE_DEST_FYLL} flex w-full flex-col gap-2 px-4 py-3 [touch-action:manipulation]`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-label text-fg">Team</span>
        <span className="text-[13px] tabular-nums text-fg-muted">
          {laster ? '…' : `${medlemmer.filter((m) => m.paJobb).length} / ${medlemmer.length}`}
        </span>
      </div>
      {laster ? (
        <p className="text-[13px] text-fg-muted">Laster ansatte …</p>
      ) : medlemmer.length === 0 ? (
        <p className="text-[13px] text-fg-muted">Ingen mekanikere lagt inn</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {medlemmer.slice(0, 6).map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-[14px] text-fg">{m.name}</span>
              <span
                data-team-status={m.paJobb ? 'pa-jobb' : 'ledig'}
                className="shrink-0 rounded-full bg-field px-2 py-0.5 text-[11px] text-fg-muted"
              >
                {m.paJobb ? 'Opptatt' : 'Ledig'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}

export function PulseFooter() {
  return (
    <nav
      data-pulse-footer
      aria-label="Mer"
      className="flex items-center justify-center gap-4 py-2 text-[14px] text-fg-muted"
    >
      <Link href={'/organisasjon' as Route} className="hover:text-fg">
        Organisasjon
      </Link>
      <span aria-hidden>·</span>
      <Link href={'/hjelp' as Route} className="hover:text-fg">
        Hjelp
      </Link>
    </nav>
  );
}
