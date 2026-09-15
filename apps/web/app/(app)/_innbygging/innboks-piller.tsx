'use client';

import type { InboxListeFilter } from '../_shell/inbox-filter';

export const INNBOKS_INNHOLD_PILLER: { key: InboxListeFilter; label: string }[] = [
  { key: 'alle', label: 'Alle' },
  { key: 'customer_dealer', label: 'Kunder' },
  { key: 'mechanic_dealer', label: 'Intern' },
  { key: 'dealer_admin', label: 'Support' },
  { key: 'lost', label: 'Løst' },
];

/**
 * Filterpiller under eksisterende innboks-chrome.
 * Ikke nye destinasjoner, ikke top-bar 2.
 */
export function InnboksFilterPiller({
  aktiv,
  onVelg,
}: {
  aktiv: InboxListeFilter;
  onVelg: (key: InboxListeFilter) => void;
}) {
  return (
    <div
      data-innboks-piller
      role="tablist"
      aria-label="Samtalefilter"
      className="flex flex-wrap gap-1.5 px-3 pb-2"
    >
      {INNBOKS_INNHOLD_PILLER.map((p) => {
        const valgt = aktiv === p.key;
        return (
          <button
            key={p.key}
            type="button"
            role="tab"
            aria-selected={valgt}
            data-innboks-pille={p.key}
            onClick={() => onVelg(p.key)}
            className={`inline-flex h-7 items-center rounded-full px-2.5 text-label ${
              valgt ? 'bg-fg text-bg' : 'bg-surface-2 text-fg'
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
