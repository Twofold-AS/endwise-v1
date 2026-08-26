'use client';

import { Badge, CircleAlert } from '@endwise/ui';
import { CardShell } from '../_shell/cards';

/** F5-02/F5-03 — Små byggeklosser kunde- og kjøretøyflatene deler. */

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

/** Seksjonsoverskrift med valgfri teller — brukes på begge detaljkortene. */
export function Seksjon({
  tittel,
  antall,
  children,
}: {
  tittel: string;
  antall?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-2 text-title text-fg">
        {tittel}
        {antall != null && antall > 0 && (
          <span className="text-[12px] text-fg-muted tabular-nums">{antall}</span>
        )}
      </h2>
      {children}
    </section>
  );
}

/** Kjøretøytype på norsk. Enum i basen, ord i UI-et. */
export const TYPE_LABEL: Record<string, string> = {
  mc: 'MC',
  boat: 'Båt',
  atv: 'ATV',
};

/**
 * Hvor raden kom fra. Quick-speilede rader kan ikke redigeres fritt her,
 * så det er verdt å se med én gang.
 */
export function Kilde({ source }: { source: string | null }) {
  if (source !== 'quick') return null;
  return <Badge variant="secondary">Quick</Badge>;
}

/** Øre → kroner. Vi lagrer i øre; flyttall og penger hører ikke sammen. */
export function kroner(ore: number | null | undefined): string {
  if (ore == null) return '—';
  return `${(ore / 100).toLocaleString('nb-NO')} kr`;
}

export function dato(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function datoTid(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * EU-frist med varsel. En dato uten kontekst er bare et tall — det som betyr
 * noe er om den har gått ut, eller er nær.
 */
export function EuFrist({ dato: d }: { dato: string | null }) {
  if (!d) return <span className="text-fg-muted">—</span>;
  const dager = (new Date(d).getTime() - Date.now()) / 86_400_000;
  const tone = dager < 0 ? 'text-danger' : dager < 60 ? 'text-warn' : 'text-fg';
  return (
    <span className={tone}>
      {dato(d)}
      {dager < 0 && ' (utgått)'}
      {dager >= 0 && dager < 60 && ` (${Math.ceil(dager)} d)`}
    </span>
  );
}
