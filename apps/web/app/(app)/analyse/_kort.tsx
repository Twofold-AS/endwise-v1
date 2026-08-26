'use client';

import { type LucideIcon, TrendingDown, TrendingUp } from '@endwise/ui';
import type { ReactNode } from 'react';
import { KILDE } from './_data';

/**
 * Analysekortet, eierens form
 * ikon + overskrift i lysere grå
 * (stiplet linje)
 * forklarende tekst
 * (luft)
 * Tallet i mørk farge +12 % (grønn) / −4 % (rød)
 * [ evt. graf ]
 * Rekkefølgen er poenget: **tallet kommer før grafen.** En verkstedeier skal
 * kunne lukke fanen etter to sekunder og likevel vite svaret. Grafen er
 * konteksten, ikke svaret.
 */
export function AnalyseKort({
  id,
  icon: Icon,
  tittel,
  forklaring,
  verdi,
  delta,
  opp,
  children,
}: {
  /** Nøkkel i `KILDE` — styrer mock-merket og kildeforklaringen. */
  id: string;
  icon: LucideIcon;
  tittel: string;
  forklaring: string;
  verdi?: string;
  delta?: string;
  opp?: boolean;
  children?: ReactNode;
}) {
  const erMock = (KILDE[id]?.kilde ?? 'mock') === 'mock';
  const Trend = opp ? TrendingUp : TrendingDown;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      {/* Overskrift: ikon + tittel i lysere grå */}
      <div className="flex items-center gap-2">
        <Icon size={16} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
        <span className="min-w-0 truncate text-label text-fg-muted">{tittel}</span>
        <span
          className={`ml-auto inline-flex h-badge shrink-0 items-center rounded-badge px-2 font-medium text-[11px] ${
            erMock ? 'bg-warn-soft text-warn' : 'bg-accent-soft text-accent-strong'
          }`}
        >
          {erMock ? 'Mock' : 'Ekte data'}
        </span>
      </div>

      {/* Stiplet linje under ikon + tekst */}
      <div className="-mt-1 border-border border-t border-dashed" />

      <p className="text-[12px] text-fg-muted leading-relaxed">{forklaring}</p>

      {/* Luft, så tallet */}
      {verdi && (
        <div className="flex items-end gap-3 pt-2">
          <p className="font-medium text-[28px] text-fg leading-none tabular-nums">{verdi}</p>
          {delta && (
            <p
              className={`inline-flex items-center gap-1 pb-0.5 text-label ${
                opp ? 'text-success' : 'text-danger'
              }`}
            >
              <Trend size={14} aria-hidden />
              {delta}
            </p>
          )}
        </div>
      )}

      {children}
    </div>
  );
}
