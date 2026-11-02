'use client';

import { cn } from '../lib/utils.ts';

export type FilterChip<K extends string = string> = {
  key: K;
  label: string;
};

/** Soft tint, stadium-pille, valgt = ink. Aldri blå. */
export function FilterChips<K extends string>({
  chips,
  valgt,
  onChange,
  ariaLabel,
  className,
}: {
  chips: readonly FilterChip<K>[];
  valgt: K;
  onChange: (key: K) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      data-filter-chips
      className={cn('flex flex-wrap gap-1.5', className)}
    >
      {chips.map((chip) => {
        const aktiv = chip.key === valgt;
        return (
          <button
            key={chip.key}
            type="button"
            role="tab"
            aria-selected={aktiv}
            onClick={() => onChange(chip.key)}
            className={cn(
              'h-7 rounded-pill px-3 text-label transition-colors',
              aktiv ? 'bg-fg text-bg' : 'bg-surface-2 text-fg hover:bg-inset',
            )}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
