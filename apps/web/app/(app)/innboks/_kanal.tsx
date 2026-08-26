'use client';

import { Globe, Mail, MessageSquare, Phone } from '@endwise/ui';
import type { ComponentType } from 'react';

/**
 * Kanal-indikatoren. Hvor kom meldingen inn, og hvor må svaret gå?
 * Hvorfor dette ikke lenger er en bryter
 * Fram til var indikatoren en prototype bak en avkrysningsboks, av
 * som standard, fordi `messages` ikke hadde noe kanalfelt — ikonet var oppdiktet.
 * Nå finnes `messages.channel` og `threads.channel` i databasen, og da er det
 * ikke lenger riktig å gjemme opplysningen: **svaret må gå tilbake samme vei.**
 * Svarer du i panelet på noe som kom som SMS, og svaret blir en app-melding,
 * får kunden det aldri. Det er ikke en detalj man skrur på ved behov.
 * Hvorfor form og farge, ikke bare farge
 * Kanalen bæres av ikonet (telefon / konvolutt / snakkeboble / klode). Fargen
 * er sekundær. Fire farger som eneste skille ville falt sammen for en
 * fargeblind bruker, og badgene har i tillegg alltid en `title`/`aria-label`.
 */
export type Kanal = 'app' | 'sms' | 'email' | 'web';

type Spek = {
  label: string;
  /** Hele setningen, til `title` og skjermleser. Kort label er ikke nok her. */
  hint: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  tone: string;
};

/**
 * Tonene er de temauavhengige `*-soft`-tokenene, ikke alfa-varianter.
 * Samme regel som `KIND_TONE` i `_lib.ts`.
 * `app` er bevisst nøytral (surface-2). Det er normaltilstanden — de fargede
 * er unntakene som fortjener øyet. Gjør man app grønn også, betyr fargen
 * ingenting lenger.
 */
export const KANAL: Record<Kanal, Spek> = {
  app: {
    label: 'App',
    hint: 'Skrevet i Endwise — svar her',
    icon: MessageSquare,
    tone: 'bg-surface-2 text-fg-muted',
  },
  sms: {
    label: 'SMS',
    hint: 'Kom inn som SMS — svaret må sendes som SMS',
    icon: Phone,
    tone: 'bg-accent-soft text-accent-strong',
  },
  email: {
    label: 'E-post',
    hint: 'Kom inn som e-post — svaret må sendes som e-post',
    icon: Mail,
    tone: 'bg-warn-soft text-warn',
  },
  web: {
    label: 'Widget',
    hint: 'Skrevet i bookingwidgeten på forhandlerens nettside',
    icon: Globe,
    tone: 'bg-surface-2 text-fg-muted',
  },
};

export function erKanal(v: string | null | undefined): v is Kanal {
  return v === 'app' || v === 'sms' || v === 'email' || v === 'web';
}

/** Ukjent verdi faller til `app` — en manglende kanal er ikke en tom rad. */
export function tilKanal(v: string | null | undefined): Kanal {
  return erKanal(v) ? v : 'app';
}

/**
 * Kompakt merke: ikon + tekst. Brukes i trådlista og over meldingene.
 * `kunIkon` finnes for de trange stedene (samtalekortets toppline), men da må
 * `title`/`aria-label` bære hele setningen — et ikon uten navn er en gåte.
 */
export function KanalMerke({
  kanal,
  kunIkon = false,
  className = '',
}: {
  kanal: Kanal;
  kunIkon?: boolean;
  className?: string;
}) {
  const k = KANAL[kanal];
  const Ikon = k.icon;

  if (kunIkon) {
    return (
      <span
        role="img"
        title={k.hint}
        aria-label={k.hint}
        className={`inline-flex size-[18px] shrink-0 items-center justify-center rounded-[5px] ${k.tone} ${className}`}
      >
        <Ikon size={12} strokeWidth={2} />
      </span>
    );
  }

  return (
    <span
      title={k.hint}
      className={`inline-flex h-badge shrink-0 items-center gap-1 rounded-badge px-1.5 font-medium text-[11px] ${k.tone} ${className}`}
    >
      <Ikon size={11} strokeWidth={2} className="shrink-0" />
      {k.label}
      <span className="sr-only"> — {k.hint}</span>
    </span>
  );
}

/**
 * Trådens kanal-linje: hvor samtalen går, og hvor svaret havner.
 * Viser to ting når de er ulike: trådens kanal (svarkanalen) og kanalen siste
 * melding faktisk kom på. Er de like — det vanlige — vises bare én, fordi to
 * identiske merker ved siden av hverandre bare er støy.
 */
export function KanalLinje({ traad, siste }: { traad: Kanal; siste: Kanal }) {
  if (traad === siste) {
    return (
      <span className="flex items-center gap-1.5">
        <KanalMerke kanal={traad} />
        <span className="text-[11px] text-fg-muted">Svar går som {KANAL[traad].label}</span>
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <KanalMerke kanal={siste} />
      <span className="text-[11px] text-fg-muted">
        siste melding · svar går som {KANAL[traad].label}
      </span>
      <KanalMerke kanal={traad} />
    </span>
  );
}
