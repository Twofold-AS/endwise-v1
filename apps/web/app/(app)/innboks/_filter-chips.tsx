'use client';

import { FilterChips } from '@endwise/ui';
import { INNBOKS_CHIPS, type InboxChip } from '../_shell/inbox-del';
import { useInboxFilter } from '../_shell/inbox-filter';

/**
 * Claude §4.2 filter-chips i lista — ikke chrome-piller.
 * Løst er ærlig stub (ingen resolved-kolonne).
 */
export function InboxFilterChips() {
  const { chip, setChip } = useInboxFilter();

  return (
    <div data-innboks-filter-chips>
      <FilterChips
        chips={INNBOKS_CHIPS}
        valgt={chip}
        onChange={(key) => setChip(key as InboxChip)}
        ariaLabel="Vis"
      />
    </div>
  );
}
