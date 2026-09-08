'use client';

import { Moon, Sun } from '@endwise/ui';
import { useTema } from '@/app/_lib/tema-provider';
import type { Tema } from '../_lib/tema';

function SystemIkon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 3.75v16.5A8.25 8.25 0 0 0 12 3.75Z" fill="currentColor" />
    </svg>
  );
}

const VALG: { id: Tema; label: string; ikon: typeof Sun | typeof Moon | typeof SystemIkon }[] = [
  { id: 'light', label: 'Lyst', ikon: Sun },
  { id: 'dark', label: 'Mørkt', ikon: Moon },
  { id: 'system', label: 'System', ikon: SystemIkon },
];

export function PhoneTemaRad() {
  const { valg, sett } = useTema();

  return (
    <div
      data-phone-profil-tema
      className="flex items-center justify-between gap-3 border-border border-y px-3 py-2.5"
    >
      <span className="text-label text-fg">Theme</span>
      <div
        role="radiogroup"
        aria-label="Tema"
        className="inline-flex items-center rounded-full bg-inset p-0.5"
      >
        {VALG.map((v) => {
          const I = v.ikon;
          const aktiv = valg === v.id;
          return (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={aktiv}
              aria-label={v.label}
              data-tema-valg={v.id}
              onClick={() => sett(v.id)}
              className={`inline-flex size-7 items-center justify-center rounded-full ${
                aktiv ? 'bg-surface-2 text-fg' : 'text-fg-muted'
              }`}
            >
              <I size={14} strokeWidth={1.6} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
