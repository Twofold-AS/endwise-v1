'use client';

import { CircleAlert } from '@endwise/ui';
import { CardShell } from '../_shell/cards';

/**
 * F5-31 — Små byggeklosser Lager-flatene deler.
 *
 * ⛔ **Ingen handel her.** Kostpris hører hjemme i Lager, utsalgspris i Butikk.
 * Ser du en «Selg»-knapp på en av disse sidene, er den i feil fane.
 */

/** Sidehode: skjult h1 (breadcrumben sier det allerede) + synlig tittel. */
export function Sidehode({ tittel, undertittel }: { tittel: string; undertittel: string }) {
  return (
    <div>
      {/* Skjult h1 for skjermlesere og dokumentstruktur — breadcrumben i
          topbaren sier allerede hvor du er. «Lager · Lager» ville vært å si
          det samme to ganger, så prefikset dropper når tittelen ER «Lager». */}
      <h1 className="sr-only">{tittel === 'Lager' ? 'Lager' : `Lager · ${tittel}`}</h1>
      <p className="text-title text-fg">{tittel}</p>
      <p className="text-body text-fg-muted">{undertittel}</p>
    </div>
  );
}

export function Laster() {
  return <p className="py-12 text-center text-body text-fg-muted">Laster …</p>;
}

export function Feil({ melding }: { melding: string }) {
  return (
    <CardShell className="flex items-start gap-3 p-6">
      <CircleAlert size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-danger" />
      <p className="text-body text-danger">{melding}</p>
    </CardShell>
  );
}

export function Tomt({ tittel, hint }: { tittel: string; hint: string }) {
  return (
    <CardShell className="p-10 text-center">
      <p className="text-label text-fg">{tittel}</p>
      <p className="mt-1 text-[12px] text-fg-muted">{hint}</p>
    </CardShell>
  );
}

/**
 * Beholdningstall. **Tilgjengelig er hovedtallet, ikke «på lager».**
 *
 * A08: en reservert del står fysisk på hylla, men er lovet bort. Viser vi
 * `onHand` som hovedtall, lover vi bort deler som allerede er lovet bort — og
 * det er nettopp dobbeltsalget reservasjonsmodellen finnes for å hindre.
 */
export function Beholdning({
  tilgjengelig,
  reservert,
  lav,
}: {
  tilgjengelig: number;
  reservert: number;
  lav?: boolean;
}) {
  return (
    <span className="flex shrink-0 items-baseline gap-1.5 tabular-nums">
      <span className={`text-label ${lav ? 'text-danger' : 'text-fg'}`}>{tilgjengelig}</span>
      {reservert > 0 && (
        <span className="text-[12px] text-fg-muted" title={`${reservert} reservert`}>
          (+{reservert} res.)
        </span>
      )}
    </span>
  );
}

/** Norsk tekst for bevegelsestypene. Enum i basen, ord i UI-et. */
export const BEVEGELSE_LABEL: Record<string, string> = {
  in: 'Inn',
  out: 'Ut',
  adjust: 'Korrigert',
  reserve: 'Reservert',
  release: 'Frigitt',
};

export const BEVEGELSE_TONE: Record<string, string> = {
  in: 'bg-success-soft text-success',
  out: 'bg-surface-2 text-fg',
  adjust: 'bg-warn-soft text-warn',
  reserve: 'bg-accent-soft text-accent-strong',
  release: 'bg-surface-2 text-fg-muted',
};

/** Øre → kroner. Vi lagrer i øre; flyttall og penger hører ikke sammen. */
export function kroner(ore: number | null): string {
  if (ore == null) return '—';
  return `${(ore / 100).toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr`;
}
