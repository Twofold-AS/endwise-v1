'use client';

import { INNBOKS_CHIPS, type InboxChip } from '../_shell/inbox-del';
import { useInboxFilter } from '../_shell/inbox-filter';

/**
 * Claude §4.2 filter-chips i lista — ikke chrome-piller.
 * Løst er ærlig stub (ingen resolved-kolonne).
 */
export function InboxFilterChips() {
  const { chip, setChip } = useInboxFilter();

  return (
    <div
      data-innboks-filter-chips
      role="tablist"
      aria-label="Vis"
      className="flex flex-wrap items-center gap-1.5 px-0 py-2"
    >
      {INNBOKS_CHIPS.map((c) => {
        const valgt = chip === c.key;
        return (
          <button
            key={c.key}
            type="button"
            role="tab"
            aria-selected={valgt}
            data-innboks-chip={c.key}
            onClick={() => setChip(c.key as InboxChip)}
            className={`inline-flex h-7 items-center rounded-full px-2.5 text-[12px] ${
              valgt ? 'bg-sidebar-active font-[650] text-fg' : 'text-fg-muted hover:bg-surface-2'
            }`}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
