'use client';

import { Badge, DitherGradient, LifeBuoy } from '@endwise/ui';
import type { CSSProperties, ReactNode } from 'react';

/**
 * BEVEL — TheFold V2 sin hevede 3D-knappeflate (#262626-face med lys topp-kant).
 */
export const BEVEL: CSSProperties = {
  background: '#262626',
  border: '1px solid #2f2f2f',
  boxShadow:
    '0 0 0 1px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.28), inset 0 2px 0 rgba(255,255,255,0.14), inset 0 -0.5px 2px rgba(0,0,0,0.3)',
};

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
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-[12px] text-white leading-none transition hover:brightness-110 ${className ?? ''}`}
    >
      {children}
    </button>
  );
}

/**
 * NewBadge — gjenbrukbar «New»-merkelapp (shadcn Badge). Rød gjennomsiktig
 * bakgrunn + rød tekst, som spesifisert. Legges på nye nav-punkter/knapper.
 */
export function NewBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={`h-4 border-danger/25 bg-danger/12 px-1.5 py-0 text-[10px] text-danger leading-none ${className ?? ''}`}
    >
      New
    </Badge>
  );
}

/**
 * CardShell — TheFold-kortet: ytre kort (radius 12, 5px padding, kant) rundt en
 * INDRE panel. Dobbelt kant-uttrykk: ytre kortkant + indre panel-kant.
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

/** CardMedia — indre innholdspanel (radius 8, mørk inset-flate). Innhold ØVERST. */
export function CardMedia({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-[#0e0e0e] ${className ?? ''}`}
      style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)' }}
    >
      {children}
    </div>
  );
}

/**
 * SupportCard — split-card for Support-kanalen (F5-11) i TheFolds kortstil:
 * dither-gradient-header (innhold øverst) → tekst + bevel-knapp under.
 */
export function SupportCard() {
  return (
    <CardShell>
      <CardMedia className="h-24">
        <DitherGradient from="green" direction="up" bloom="aura" />
        <div className="absolute inset-0 grid place-items-center text-white">
          <LifeBuoy size={30} strokeWidth={1.75} />
        </div>
      </CardMedia>
      <div className="flex flex-col gap-2 px-1.5 pt-2 pb-1">
        <div className="flex flex-col gap-0.5">
          <div className="font-semibold text-[13px] text-fg">Support</div>
          <div className="text-[12px] text-fg-faint leading-snug">
            Direkte linje til Endwise — spør oss, meld feil, få hjelp.
          </div>
        </div>
        <BevelButton className="self-start">Åpne kanal</BevelButton>
      </div>
    </CardShell>
  );
}
