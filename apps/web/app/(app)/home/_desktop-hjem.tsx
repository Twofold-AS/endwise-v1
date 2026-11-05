'use client';

import { ArrowRight, Inbox, Package } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { DagTidslinje } from '../_shell/dag-tidslinje';
import { HJEM_SCROLL_FLATE, PHONE_HERO_FYLL, PHONE_KORT_META } from '../_shell/phone-home';
import { useDealerHjemKort } from '../_shell/phone-home-dealer';
import {
  PulseAnalyserKort,
  PulseAvvikForesporBoks,
  PulseBunntekst,
  PulseDagSirkel,
  PulseEndringerKnapp,
  PulseRadKort,
  PulseTall,
} from '../_shell/pulse-kort';

/**
 * Verkstedet på desktop (Claude-designet): én bred flate.
 * Hero m/ 4 stats + dagsbue → Dagens timeplan (mekaniker-tidslinje) →
 * avvik/forespørsler + Endringer. Under: Analyse i full bredde, to halvkort.
 * Samme datakrok som telefonen — ekte 0, ingen mock.
 */
export function VerkstedetDesktopBred() {
  const {
    bookings,
    threads,
    oversikt,
    mekanikerListe,
    deler,
    idag,
    dag,
    avvik,
    forespor,
    innboks,
    lager,
    ansatte,
    analyser,
  } = useDealerHjemKort();
  const lasterJobber = bookings.isLoading;

  return (
    <div
      className={`${HJEM_SCROLL_FLATE} mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-8 py-4`}
    >
      <h1 className="sr-only">Verkstedet</h1>

      <div
        data-pulse-kort="hero"
        data-verkstedet-hero=""
        data-desktop-hjem-hero
        className={`${PHONE_HERO_FYLL} flex w-full flex-col gap-4 p-5`}
      >
        <p data-pulse-ukedag className="text-[20px] leading-7 font-semibold text-fg">
          {dag.ukedag}{' '}
          <span data-pulse-dato className="text-[17px] font-normal text-fg-muted">
            {dag.dato}
          </span>
        </p>

        <div className="flex items-end gap-6">
          <div className="flex min-w-0 flex-1 divide-x divide-divide" data-pulse-teller-rad>
            <div className="flex-1 pr-6">
              <PulseTall label="Planlagt" verdi={idag.planlagt} laster={lasterJobber} />
            </div>
            <div className="flex-1 px-6">
              <PulseTall label="Pågår" verdi={idag.paagaar} laster={lasterJobber} />
            </div>
            <div className="flex-1 px-6">
              <PulseTall label="Ferdig" verdi={idag.ferdig} laster={lasterJobber} />
            </div>
            <div className="flex-1 pl-6">
              <PaJobbStat
                paJobb={ansatte.paJobb}
                totalt={ansatte.totalt}
                laster={mekanikerListe.isLoading && oversikt.isLoading}
              />
            </div>
          </div>
          <PulseDagSirkel />
        </div>

        <div className="border-t border-divide" />

        <DagTidslinje
          jobber={bookings.data ?? []}
          mekanikere={(mekanikerListe.data ?? oversikt.data ?? []).map((m) => ({
            id: m.id,
            name: m.name,
          }))}
          laster={lasterJobber}
        />

        <div className="border-t border-divide" />

        <div className="flex w-full items-center justify-between gap-3">
          <PulseAvvikForesporBoks avvik={avvik} forespor={forespor} laster={lasterJobber} />
          <PulseEndringerKnapp />
        </div>
      </div>

      <PulseAnalyserKort
        stats={analyser}
        href={PHONE_KORT_META.analyser.href}
        laster={lasterJobber}
      />

      <div className="grid w-full grid-cols-2 gap-4">
        <PulseRadKort
          href={PHONE_KORT_META.innboks.href}
          ikon={Inbox}
          tittel="Uleste meldinger"
          teller={innboks.meldinger}
          laster={threads.isLoading}
        />
        <PulseRadKort
          href={PHONE_KORT_META.lager.href}
          ikon={Package}
          tittel={lager.tittel}
          teller={lager.antall}
          laster={deler.isLoading}
        />
      </div>

      <PulseBunntekst />
    </div>
  );
}

/** På jobb — stat-celle som er en knapp (Claude-designet: → ansatte). */
function PaJobbStat({
  paJobb,
  totalt,
  laster,
}: {
  paJobb: number;
  totalt: number;
  laster: boolean;
}) {
  return (
    <Link
      href={PHONE_KORT_META.team.href as Route}
      data-desktop-pa-jobb
      className="group flex min-w-0 flex-col items-center justify-end text-center [touch-action:manipulation]"
    >
      <p className="text-[36px] leading-none font-semibold text-fg tabular-nums">
        {laster ? (
          <span className="inline-block h-9 w-12 animate-pulse rounded-sm bg-border" />
        ) : (
          `${paJobb} / ${totalt}`
        )}
      </p>
      <p className="mt-1.5 inline-flex items-center gap-1 text-[13px] leading-4 text-fg-muted group-hover:text-fg">
        På jobb
        <ArrowRight size={13} strokeWidth={1.75} aria-hidden />
      </p>
    </Link>
  );
}
