'use client';

import { Badge, LifeBuoy } from '@endwise/ui';
import type { CSSProperties, ReactNode } from 'react';

/**
 * Bevel — den hevede knappeflaten. Leser nå token-laget i stedet for TheFolds
 * mørke `#262626`, så den snur med temaet: hvit flate med myk topp-høylys i
 * lyst, mørk grå i mørkt. Verdiene bor i `widget-tokens`, ikke her.
 */
export const BEVEL: CSSProperties = {
  background: 'var(--ew-bevel-face)',
  border: '1px solid var(--ew-bevel-border)',
  boxShadow: 'var(--ew-bevel-shadow)',
  color: 'var(--ew-bevel-fg)',
};

/** Knapp: 32px høyde, 10px radius (eierens spec). */
export function BevelButton({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={BEVEL}
      className={`inline-flex h-control items-center justify-center gap-1.5 rounded-control px-3 text-label transition hover:brightness-[0.98] ${className ?? ''}`}
    >
      {children}
    </button>
  );
}

/**
 * NewBadge — «Ny»-merkelapp. Badge-formen (20px høyde, 6px radius) + rød
 * `destructive`-variant (eiers beslutning ). Norsk kopi .
 * Formen er felles, fargen er signalet: «nytt» skal fange blikket, og etter at
 * aksenten ble svart ville en aksentfarget badge forsvunnet i resten av UI-et.
 * Uleste-antall er `CountBadge` — samme form, siffer i stedet for «Ny».
 */
export function NewBadge({ className }: { className?: string }) {
  return (
    <Badge variant="destructive" className={className}>
      Ny
    </Badge>
  );
}

/**
 * CountBadge — uleste-teller (innboks, nav, helpdesk-antall).
 * Samme badge-oppsett som `NewBadge` (`Badge variant="destructive"`, 20px/6px).
 * Mikael : ikke 18px-sirkelen fra #35, ikke grå pille, ikke grønn.
 * 0 skjules. Tallet vises som det er (ikke «9+»).
 */
export function CountBadge({
  count,
  label,
  className,
}: {
  count: number;
  /** Skjermleser-suffiks, f.eks. «uleste» eller «nye artikler». */
  label: string;
  className?: string;
}) {
  if (count <= 0) return null;
  return (
    <Badge
      variant="destructive"
      className={`tabular-nums ${className ?? ''}`}
      aria-label={`${count} ${label}`}
    >
      {count}
    </Badge>
  );
}

/**
 * CardShell — TheFold-kortet: ytre kort (radius 12, 5px padding, kant) rundt en
 * Indre panel. Dobbelt kant-uttrykk: ytre kortkant + indre panel-kant.
 * Bruk med `CardMedia` (innhold øverst) + en tekstdel under.
 */
export function CardShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border border-border bg-card p-[5px] ${className ?? ''}`}
    >
      {children}
    </div>
  );
}

/**
 * CardMedia — indre innholdspanel (radius 8, inset-flate). Innhold Øverst.
 * Inset-kanten er en ekte hårlinje fra token-laget nå, ikke et hvitt overlegg
 * et 4 % hvitt overlegg er usynlig mot en hvit flate.
 */
export function CardMedia({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-border bg-inset ${className ?? ''}`}
    >
      {children}
    </div>
  );
}

/**
 * SupportCard — split-card for Support-kanalen (F5-11): mediepanel øverst →
 * tekst + bevel-knapp under.
 * `DitherGradient` fjernet (dither-kit ut av UI-et). Panelet er
 * nå en rolig aksentflate med ikonet — kortet står, effekten er borte.
 */
export function SupportCard() {
  return (
    <CardShell>
      <CardMedia className="h-24 bg-accent-soft">
        <div className="absolute inset-0 grid place-items-center text-accent-strong">
          <LifeBuoy size={28} strokeWidth={1.75} />
        </div>
      </CardMedia>
      <div className="flex flex-col gap-2 px-1.5 pt-2 pb-1">
        <div className="flex flex-col gap-1">
          <div className="text-label text-fg">Support</div>
          <div className="text-[12px] text-fg-muted leading-snug">
            Direkte linje til Endwise — spør oss, meld feil, få hjelp.
          </div>
        </div>
        <BevelButton className="self-start">Åpne kanal</BevelButton>
      </div>
    </CardShell>
  );
}
