'use client';

import type { Route } from 'next';
import Link from 'next/link';

/**
 * Hjem-footer som tekst — Organisasjon · Hjelp.
 * Ikke pulse-kort, ikke destinasjon i chrome, ikke hero.
 */
export function PulseTekstFooter() {
  return (
    <nav
      data-pulse-footer
      aria-label="Organisasjon og hjelp"
      className="flex items-center justify-center gap-4 px-1 py-1"
    >
      <Link
        href={'/organisasjon' as Route}
        data-pulse-footer-lenke="organisasjon"
        className="text-label font-normal text-fg-muted underline-offset-2 hover:text-fg hover:underline"
      >
        Organisasjon
      </Link>
      <span className="text-fg-faint" aria-hidden>
        ·
      </span>
      <Link
        href={'/hjelp' as Route}
        data-pulse-footer-lenke="hjelp"
        className="text-label font-normal text-fg-muted underline-offset-2 hover:text-fg hover:underline"
      >
        Hjelp
      </Link>
    </nav>
  );
}
