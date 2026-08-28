'use client';

import { ChevronRight } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { breadcrumbFor, contextForPath } from './nav';

/**
 * Top-bar 1 — breadcrumb. Kollaps bor i sidebaren.
 * Jonas 28.08: én 32-rad (h-control), ikke 56px med 16+16 padding.
 */
export function TopBar() {
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();
  const crumbs = breadcrumbFor(pathname, searchParams?.toString() ?? '', contextForPath(pathname));

  return (
    <header className="flex h-control shrink-0 items-center gap-2 border-border border-b bg-bg px-4">
      <nav aria-label="Du er her" className="flex min-w-0 items-center gap-1.5">
        {crumbs.length === 0 ? (
          <span className="text-fg-muted text-label">Endwise</span>
        ) : (
          crumbs.map((c, i) => (
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
          ))
        )}
      </nav>
    </header>
  );
}
