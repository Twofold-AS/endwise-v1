'use client';

import { cn } from '../lib/utils.ts';

export type FilterChip<K extends string = string> = {
  key: K;
  label: string;
};

/** Soft tint, stadium-pille. Valgt = hvit + ink-kant. Aldri blå. */
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
      className={cn(
        'no-scrollbar flex flex-nowrap gap-1.5 overflow-x-auto md:flex-wrap',
        className,
      )}
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
              'h-10 shrink-0 rounded-pill px-4 text-[13px] font-[450] transition-colors md:h-7 md:px-3 md:text-label',
              aktiv
                ? 'border border-fg bg-bg text-fg'
                : 'border border-transparent bg-surface-2 text-fg hover:bg-inset',
            )}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
