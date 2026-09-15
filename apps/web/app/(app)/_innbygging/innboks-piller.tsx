'use client';

import type { InboxListeFilter } from '../_shell/inbox-filter';
import { innholdPilleKlasse } from './innhold-piller';

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
            className={innholdPilleKlasse(valgt)}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
