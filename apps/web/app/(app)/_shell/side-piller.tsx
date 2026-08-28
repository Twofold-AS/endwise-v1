'use client';

import type { Route } from 'next';
import Link from 'next/link';

export type SidePille = {
  label: string;
  href: string;
};

/**
 * Horisontale piller på siden. Ikke barn i sidebaren (Jonas 28.08).
 * Samme chrome som Innstillinger.
 */
export function SidePiller({
  ariaLabel,
  piller,
  aktivHref,
}: {
  ariaLabel: string;
  piller: readonly SidePille[];
  aktivHref: string;
}) {
  if (piller.length <= 1) return null;
  return (
    <div role="tablist" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {piller.map((p) => {
        const valgt = p.href === aktivHref;
        return (
          <Link
            key={p.href}
            href={p.href as Route}
            role="tab"
            aria-selected={valgt}
            scroll={false}
            className={`inline-flex h-control items-center rounded-pill px-3 text-label transition-colors ${
              valgt
                ? 'bg-fg text-bg'
                : 'border border-border bg-bg text-fg-muted hover:bg-surface-2 hover:text-fg'
            }`}
          >
            {p.label}
          </Link>
        );
      })}
    </div>
  );
}
