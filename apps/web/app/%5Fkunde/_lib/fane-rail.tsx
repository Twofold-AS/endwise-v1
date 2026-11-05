'use client';

import { usePathname } from 'next/navigation';
import { KUNDE_FANER, kundeFaneAktiv } from './faner.ts';

export function KundeFaneRail() {
  const path = usePathname() ?? '/';

  return (
    <nav
      data-kunde-faner
      aria-label="Kunde"
      className="mx-auto mt-3 flex max-w-lg gap-1 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {KUNDE_FANER.map((f) => {
        const aktiv = kundeFaneAktiv(path, f.href);
        return (
          <a
            key={f.href}
            href={f.href}
            aria-current={aktiv ? 'page' : undefined}
            className={`inline-flex h-12 shrink-0 items-center rounded-pill px-3.5 text-[16px] font-[450] ${
              aktiv ? 'bg-fg text-bg font-[650]' : 'text-fg'
            }`}
          >
            {f.label}
          </a>
        );
      })}
    </nav>
  );
}
