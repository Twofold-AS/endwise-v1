'use client';

import { ChevronRight, Plus } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { breadcrumbFor, contextForPath } from './nav';
import { erBredHjemFlate, utenVerkstedetCrumb } from './seksjon-sti';

/**
 * Top-bar over box 2 — 598×53. Place-you-are-skilt.
 * På hjem-flatene (Claude-designet) er den 1050 bred med «Ny jobb»-pille.
 * Telefon bruker PhoneShell; denne er `hidden md:flex`.
 */
export function TopBar() {
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();
  const bredHjem = erBredHjemFlate(pathname);
  const crumbs = utenVerkstedetCrumb(
    breadcrumbFor(pathname, searchParams?.toString() ?? '', contextForPath(pathname)),
  );

  return (
    <header
      data-shell-topbar="2"
      className={`hidden h-[53px] w-full shrink-0 items-center gap-2 border-border border-b bg-bg px-4 md:flex ${
        bredHjem ? 'md:w-[1050px]' : 'md:w-[598px]'
      }`}
    >
      <nav aria-label="Du er her" className="flex min-w-0 items-center gap-1.5">
        {crumbs.length === 0
          ? null
          : crumbs.map((c, i) => (
              <span key={c.label} className="flex min-w-0 items-center gap-1.5">
                {i > 0 && <ChevronRight size={14} className="shrink-0 text-fg-muted" aria-hidden />}
                {c.href && i < crumbs.length - 1 ? (
                  <Link
                    href={c.href as Route}
                    className="truncate text-fg-muted text-label transition-colors hover:text-fg"
                  >
                    {c.label}
                  </Link>
                ) : (
                  <span
                    aria-current={i === crumbs.length - 1 ? 'page' : undefined}
                    className={`truncate text-label ${
                      i === crumbs.length - 1 ? 'text-fg' : 'text-fg-muted'
                    }`}
                  >
                    {c.label}
                  </span>
                )}
              </span>
            ))}
      </nav>
      {bredHjem ? (
        <Link
          href={'/bookinger/ny' as Route}
          data-toppbar-ny-jobb
          className="ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-fg px-4 text-label text-bg [touch-action:manipulation]"
        >
          <Plus size={15} strokeWidth={2} aria-hidden />
          Ny jobb
        </Link>
      ) : null}
    </header>
  );
}
