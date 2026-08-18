'use client';

import { Button } from '@endwise/ui/components/button';
import { cn } from '@endwise/ui/lib/utils';
import { AlertTriangle, Check, ChevronRight, Loader2, ShieldAlert, X } from 'lucide-react';
import type * as React from 'react';

/*
 * TOOL-PARTS — én agent-handling, vist fram mens den skjer.
 * Se UI-PAKKER.md §9.
 *
 * ── ⚠️ Egenskrevet, og hvorfor ───────────────────────────────────────────
 * shadcn har ingen tool-part-komponent i registeret (verifisert 12.08.2026).
 * Mønsteret finnes i `chatbot-template` som eksempelkode, ikke som en
 * installerbar komponent — så dette er ~90 linjer stil over AI SDK sin
 * `ToolUIPart`-tilstandsmaskin, ikke en erstatning for en pakke.
 *
 * ── Tilstandene er AI SDK sine, ikke våre ────────────────────────────────
 * `input-streaming` → `input-available` → (`approval-requested` →
 * `approval-responded`) → `output-available` | `output-error` | `output-denied`.
 * Navnene speiles med vilje ett-til-ett: en egen oversettelse ville betydd at
 * en ny SDK-tilstand stille falt ut av UI-et.
 *
 * ── Hvorfor vise verktøykall i det hele tatt ─────────────────────────────
 * En agent som svarer «jeg fant tre ledige timer» uten å vise at den slo opp,
 * ber om tillit den ikke har gjort seg fortjent til. Her ser forhandleren HVA
 * som ble gjort, i hvilken rekkefølge, og hva som kom tilbake. Det er også det
 * eneste stedet en feil («oppslaget feilet») kan bli synlig i stedet for å bli
 * borte i en formulering.
 *
 * ⛔ `output` rendres som tekst, ALDRI som HTML. Verktøy-output er data fra en
 * modell og en database — behandles som utrygt (guardrail L4, F6-14).
 */

/** Speiler AI SDK sine `ToolUIPart`-tilstander. */
export type ToolPartStatus =
  | 'input-streaming'
  | 'input-available'
  | 'approval-requested'
  | 'approval-responded'
  | 'output-available'
  | 'output-error'
  | 'output-denied';

const STATUS_TEKST: Record<ToolPartStatus, string> = {
  'input-streaming': 'forbereder',
  'input-available': 'kjører',
  'approval-requested': 'venter på din godkjenning',
  'approval-responded': 'godkjenning gitt',
  'output-available': 'ferdig',
  'output-error': 'feilet',
  'output-denied': 'avvist',
};

function StatusIkon({ status }: { status: ToolPartStatus }) {
  if (status === 'input-streaming' || status === 'input-available') {
    return <Loader2 className="size-3.5 shrink-0 animate-spin text-fg-muted" aria-hidden />;
  }
  if (status === 'approval-requested') {
    return <ShieldAlert className="size-3.5 shrink-0 text-warn" aria-hidden />;
  }
  if (status === 'output-error') {
    return <AlertTriangle className="size-3.5 shrink-0 text-destructive" aria-hidden />;
  }
  if (status === 'output-denied') {
    return <X className="size-3.5 shrink-0 text-fg-muted" aria-hidden />;
  }
  return <Check className="size-3.5 shrink-0 text-accent-strong" aria-hidden />;
}

/**
 * Ett verktøykall. `navn` er den NORSKE etiketten («Slår opp tjenester»), ikke
 * det tekniske verktøynavnet — kallstedet oversetter, fordi bare det vet hvilken
 * agent det gjelder.
 */
export function ToolPart({
  navn,
  status,
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & { navn: string; status: ToolPartStatus }) {
  return (
    <div
      data-slot="tool-part"
      data-status={status}
      className={cn(
        'flex w-fit max-w-full min-w-0 flex-col gap-2 rounded-control border border-border bg-surface-2/60 px-3 py-2',
        status === 'approval-requested' && 'border-warn bg-warn-soft/40',
        status === 'output-error' && 'border-destructive/40',
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-2">
        <StatusIkon status={status} />
        <span className="min-w-0 truncate text-label text-fg">{navn}</span>
        <span className="shrink-0 text-[12px] text-fg-muted">· {STATUS_TEKST[status]}</span>
      </div>
      {children}
    </div>
  );
}

/** Utfoldbar detalj — inn- eller utdata. Lukket som standard: normalt er det
 *  NAVNET som er interessant, og innmaten kun når noe ser rart ut. */
export function ToolPartDetalj({
  etikett,
  verdi,
  className,
  ...props
}: Omit<React.ComponentProps<'details'>, 'children'> & { etikett: string; verdi: unknown }) {
  return (
    <details data-slot="tool-part-detalj" className={cn('min-w-0', className)} {...props}>
      <summary className="flex cursor-pointer list-none items-center gap-1 text-[12px] text-fg-muted hover:text-fg [&::-webkit-details-marker]:hidden">
        <ChevronRight
          className="size-3 transition-transform [details[open]_&]:rotate-90"
          aria-hidden
        />
        {etikett}
      </summary>
      {/* JSON.stringify, ikke dangerouslySetInnerHTML. Se filhodet. */}
      <pre className="mt-1.5 max-h-48 overflow-auto rounded-badge bg-bg p-2 font-mono text-[11px] text-fg-muted">
        {typeof verdi === 'string' ? verdi : JSON.stringify(verdi, null, 2)}
      </pre>
    </details>
  );
}

/**
 * ⛔ GODKJENN-FØR-AGENTEN-SKRIVER.
 *
 * Samme prinsipp som overalt ellers hos oss (Quick-push, Framer-publisering):
 * agenten kan foreslå, mennesket utfører. Sperren ligger IKKE her — den ligger i
 * `needsApproval` på verktøyet på serveren, og AI SDK holder kallet tilbake til
 * svaret kommer. Denne komponenten er bare der spørsmålet stilles.
 *
 * Derfor er «Avvis» like framtredende som «Godkjenn»: et godkjenn-steg der det
 * ene valget er en gråtone er ikke et valg, det er en bekreftelsesdialog.
 */
export function ToolPartGodkjenning({
  sporsmal,
  onGodkjenn,
  onAvvis,
  className,
  ...props
}: Omit<React.ComponentProps<'div'>, 'onSubmit'> & {
  sporsmal: string;
  onGodkjenn: () => void;
  onAvvis: () => void;
}) {
  return (
    <div
      data-slot="tool-part-godkjenning"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    >
      <p className="text-body text-fg leading-relaxed">{sporsmal}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={onGodkjenn}>
          Godkjenn
        </Button>
        <Button size="sm" variant="outline" onClick={onAvvis}>
          Avvis
        </Button>
      </div>
    </div>
  );
}
