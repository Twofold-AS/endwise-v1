'use client';

import { ChevronDown } from '@endwise/ui';
import { useEffect, useRef, useState } from 'react';
import { type InboxSortering, useInboxFilter } from '../_shell/inbox-filter';

const VALG: { id: InboxSortering; label: string }[] = [
  { id: 'nyeste', label: 'Nyeste' },
  { id: 'eldste', label: 'Eldste' },
];

/**
 * Sortering som Modus-plata i profilmenyen — valgknapper i `.ew-modus-plate`,
 * ikke Nyeste/Eldste-piller i verktøylinja og ikke shadcn-liste.
 */
export function InboxSorteringVelger({ startApen = false }: { startApen?: boolean }) {
  const { sortering, setSortering } = useInboxFilter();
  const [apen, setApen] = useState(startApen);
  const rot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function lukk(e: PointerEvent) {
      if (!rot.current?.contains(e.target as Node)) setApen(false);
    }
    document.addEventListener('pointerdown', lukk);
    return () => document.removeEventListener('pointerdown', lukk);
  }, []);

  const aktiv = VALG.find((v) => v.id === sortering) ?? VALG[0];

  return (
    <div ref={rot} className="relative" data-innboks-sortering>
      <button
        type="button"
        aria-expanded={apen}
        aria-haspopup="true"
        aria-label="Sorter samtaler"
        onClick={() => setApen((v) => !v)}
        className="inline-flex min-h-11 items-center gap-1 rounded-control px-2.5 text-label text-fg hover:bg-surface-2"
      >
        {aktiv.label}
        <ChevronDown size={14} strokeWidth={2} aria-hidden />
      </button>
      {apen ? (
        <div
          role="listbox"
          aria-label="Sorter samtaler"
          className="absolute top-full left-0 z-30 mt-1"
        >
          <div
            data-innboks-sortering-plate
            className="ew-modus-plate inline-flex items-center rounded-full p-0.5"
          >
            {VALG.map((v) => {
              const valgt = sortering === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={valgt}
                  onClick={() => {
                    setSortering(v.id);
                    setApen(false);
                  }}
                  className="inline-flex h-7 items-center text-fg-muted aria-pressed:text-fg"
                >
                  <span
                    className={`inline-flex h-6 items-center rounded-full px-2.5 text-[13px] font-[650] ${
                      valgt ? 'border border-fg text-fg' : 'border border-transparent'
                    }`}
                  >
                    {v.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
