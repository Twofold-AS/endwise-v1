'use client';

import { ArrowUpRight, ChevronDown, X } from '@endwise/ui';
import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { NewBadge } from './cards';
import {
  erTestHelpdeskTittel,
  HELPDESK_SLIDER_MINIMER_KEY,
  harNyUlestArtikkel,
  lesLagretMinimer,
  sliderStartMinimer,
} from './helpdesk-slider';

/**
 * Nytt fra helpdesken. Slideren nederst i sidebaren.
 * Fast høyde når den er utvidet
 * Fram til var kortet et fritt `flex flex-col` med fire hardkodede
 * tips av ulik lengde. Hvert niende sekund byttet teksten, høyden endret seg
 * og siden kortet ligger nederst i en kolonne, dyttet det alt over seg opp og
 * ned mens man jobbet. En slider som flytter på navigasjonen er verre enn
 * ingen slider.
 * Utvidet er høyden låst i `HOYDE`, bildet har fast forhold, og teksten
 * klippes med `line-clamp`. Brukeren kan minimere (X) til en kompakt bar;
 * det er lov å krympe da. Karusellen skal bare ikke hoppe hvert 9. sekund.
 * Drevet av data, ikke av en liste i denne fila
 * Innholdet er de fire nyeste publiserte artiklene fra helpdesken. Skriver
 * Endwise-admin en ny artikkel, dukker den opp her uten at noen rører kode.
 * Ny tvinger åpen
 * Ulest artikkel ved lasting = full slider, også hvis localStorage sier
 * minimert. Brukeren kan likevel lukke. En ny ulest (ny id, eller ulest
 * none→some etter query-oppdatering) åpner igjen.
 * Ingen 5-min `staleTime`. Sidebaren ligger på hver side, men nye
 * artikler skal treffe ved window-focus. Pr #36 LiveSync har ingen
 * helpdesk-SSE (kun inbox/entitlements) — vi finner ikke opp en ny buss.
 */
const INTERVAL_MS = 9000;

/**
 * Ett tall, ett sted. Bildet (72px) + teksten + prikkeraden må summere seg
 * til dette, ellers hopper kortet likevel. Endrer du høyden, endre her.
 */
const HOYDE = 208;

export function TipCard() {
  const artikler = trpc.helpdesk.list.useQuery(
    { limit: 4 },
    { retry: false, refetchOnWindowFocus: true },
  );
  const rader = (artikler.data ?? []).filter((r) => !erTestHelpdeskTittel(r.title));
  const harUlest = rader.some((r) => r.ulest === true);

  const [i, setI] = useState(0);
  const [minimer, setMinimer] = useState(false);
  const forrige = useRef<{ id: string; ulest: boolean }[] | null>(null);

  useEffect(() => {
    if (!artikler.isSuccess) return;
    const snap = (artikler.data ?? [])
      .filter((rad) => !erTestHelpdeskTittel(rad.title))
      .map((rad) => ({ id: rad.id, ulest: rad.ulest === true }));
    if (forrige.current == null) {
      let lagret: boolean | null = null;
      try {
        lagret = lesLagretMinimer(window.localStorage.getItem(HELPDESK_SLIDER_MINIMER_KEY));
      } catch {
        /* localStorage kan være sperret */
      }
      setMinimer(
        sliderStartMinimer(
          lagret,
          snap.some((r) => r.ulest),
          snap.length === 0,
        ),
      );
    } else if (harNyUlestArtikkel(forrige.current, snap)) {
      setMinimer(false);
    }
    forrige.current = snap;
  }, [artikler.isSuccess, artikler.data]);

  function settMinimer(neste: boolean) {
    setMinimer(neste);
    try {
      window.localStorage.setItem(HELPDESK_SLIDER_MINIMER_KEY, neste ? '1' : '0');
    } catch {
      /* localStorage kan være sperret */
    }
  }

  /* Lista kan krympe (en artikkel avpubliseres) mens indeksen står igjen. */
  useEffect(() => {
    if (i >= rader.length) setI(0);
  }, [i, rader.length]);

  useEffect(() => {
    if (minimer) return;
    if (rader.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % rader.length), INTERVAL_MS);
    return () => clearInterval(t);
  }, [rader.length, minimer]);

  /**
   * Tom liste sletter ikke widgeten. #60 returnerte `null` når lista
   * var tom (eller bare test-artikler), og da forsvant Hjelp helt.
   * Chrome skal stå: minimert bar merket Hjelp, med måte å utvide.
   */
  const a = rader[Math.min(i, rader.length - 1)];
  if (minimer || !artikler.isSuccess) {
    return (
      <button
        type="button"
        aria-label="Utvid helpdesk-slider"
        title="Utvid helpdesk-slider"
        onClick={() => settMinimer(false)}
        className="flex h-row-store w-full min-w-0 items-center gap-2 rounded-xl border border-border bg-bg px-3 text-left transition-colors hover:bg-sidebar-active focus-visible:outline-2 focus-visible:outline-ring"
      >
        <span className="min-w-0 flex-1 truncate text-[11px] text-fg-muted">
          {a?.title ?? 'Hjelp'}
        </span>
        {harUlest ? <NewBadge /> : null}
        <ChevronDown size={14} className="shrink-0 text-fg-muted" aria-hidden />
      </button>
    );
  }

  if (rader.length === 0) {
    return (
      <div className="relative flex flex-col gap-2 rounded-xl border border-border bg-bg px-3 py-3">
        <button
          type="button"
          aria-label="Minimer helpdesk-slider"
          title="Minimer helpdesk-slider"
          className="absolute top-1.5 right-1.5 z-10 inline-flex size-6 items-center justify-center rounded-control text-fg-muted transition-colors hover:bg-sidebar-active hover:text-fg focus-visible:outline-2 focus-visible:outline-ring"
          onClick={() => settMinimer(true)}
        >
          <X size={14} strokeWidth={1.75} />
        </button>
        <span className="pr-8 text-label text-fg">Hjelp</span>
        <p className="text-[11px] text-fg-muted">Ingen artikler ennå.</p>
        <Link
          href={'/hjelp' as Route}
          className="text-[11px] text-fg-muted underline underline-offset-2 transition-colors hover:text-fg"
        >
          Alle
        </Link>
      </div>
    );
  }

  if (!a) {
    return (
      <button
        type="button"
        aria-label="Utvid helpdesk-slider"
        title="Utvid helpdesk-slider"
        onClick={() => settMinimer(false)}
        className="flex h-row-store w-full min-w-0 items-center gap-2 rounded-xl border border-border bg-bg px-3 text-left transition-colors hover:bg-sidebar-active focus-visible:outline-2 focus-visible:outline-ring"
      >
        <span className="min-w-0 flex-1 truncate text-[11px] text-fg-muted">Hjelp</span>
        <ChevronDown size={14} className="shrink-0 text-fg-muted" aria-hidden />
      </button>
    );
  }

  return (
    <div
      style={{ height: HOYDE }}
      className="relative flex flex-col overflow-hidden rounded-xl border border-border bg-bg"
    >
      <button
        type="button"
        aria-label="Minimer helpdesk-slider"
        title="Minimer helpdesk-slider"
        className="absolute top-1.5 right-1.5 z-10 inline-flex size-6 items-center justify-center rounded-control text-fg-muted transition-colors hover:bg-sidebar-active hover:text-fg focus-visible:outline-2 focus-visible:outline-ring"
        onClick={() => settMinimer(true)}
      >
        <X size={14} strokeWidth={1.75} />
      </button>

      <Link href={`/support/${a.slug}` as Route} className="group flex min-h-0 flex-1 flex-col">
        <div className="flex flex-col gap-1.5 px-3 pt-3 pr-8">
          {/*
           * «Ny»-tekstbadge når artikkelen er ulest for deg — et merke
           * alle alltid ser, betyr ingenting. Telleren i navet er CountBadge.
           */}
          <span className="flex items-center gap-2">
            {a.ulest ? (
              <NewBadge />
            ) : (
              <span className="text-[11px] text-fg-muted">Fra helpdesken</span>
            )}
          </span>

          {/*
           * Overskrift med linje under teksten, og pil som sier at den kan
           * leses. Pilen flytter seg litt på hover — den eneste bevegelsen i
           * kortet som ikke er tidsstyrt.
           */}
          <span className="flex items-start gap-1.5 border-border border-b pb-1.5">
            <span className="line-clamp-2 min-w-0 flex-1 text-label text-fg">{a.title}</span>
            <ArrowUpRight
              size={14}
              strokeWidth={1.75}
              className="mt-0.5 shrink-0 text-fg-muted transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </div>

        {/*
         * Bildet under, fast forhold. `sizes` er sidebarbredden minus padding
         * et for stort tall her laster dobbelt så store filer uten at noe
         * ser galt ut.
         */}
        <div className="relative mx-3 mt-2 h-[72px] shrink-0 overflow-hidden rounded-lg bg-surface-2">
          {a.image && <Image src={a.image} alt="" fill sizes="224px" className="object-cover" />}
        </div>
      </Link>

      {/* Prikkene: også navigasjon, ikke bare en indikator. */}
      <div className="mt-auto flex items-center gap-1.5 px-3 pb-3">
        {rader.map((r, n) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setI(n)}
            aria-label={`Vis: ${r.title}`}
            aria-current={n === i}
            className={`h-1.5 rounded-pill transition-all ${
              n === i ? 'w-4 bg-accent-strong' : 'w-1.5 bg-border hover:bg-border-strong'
            }`}
          />
        ))}
        <Link
          href={'/support' as Route}
          className="ml-auto text-[11px] text-fg-muted underline underline-offset-2 transition-colors hover:text-fg"
        >
          Alle
        </Link>
      </div>
    </div>
  );
}
