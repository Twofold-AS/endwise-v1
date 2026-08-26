'use client';

import { ChevronRight, PanelLeftClose, PanelLeftOpen } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { breadcrumbFor, contextForPath } from './nav';
import { useSidebarState } from './sidebar-state';

/**
 * Topbaren er redusert til ÉN jobb: si hvor du er.
 * Fjernet : logo-lenke, seksjonsnavigasjon og søkeknapp. Alt tre bor
 * nå i sidebaren. En topbar med knapper og en sidebar med de samme knappene ga
 * to svar på «hvor klikker jeg» — og to steder å glemme å oppdatere.
 * Søket er ikke borte, det er flyttet til tastaturet (K) med synlig inngang
 * nederst i sidebaren. Se `command-palette.tsx`.
 */
export function TopBar() {
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();
  const crumbs = breadcrumbFor(pathname, searchParams?.toString() ?? '', contextForPath(pathname));
  const { collapsed, toggle } = useSidebarState();

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-border border-b bg-bg px-4">
      {/*
       * Kollaps-knappen bor her, ikke i sidebaren: den handler om hvor mye plass
       * Innholdet skal få, og da hører den hjemme over innholdet.
       */}
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? 'Utvid sidebaren' : 'Gjør sidebaren mindre'}
        title={collapsed ? 'Utvid sidebaren' : 'Gjør sidebaren mindre'}
        aria-expanded={!collapsed}
        className="flex size-control shrink-0 items-center justify-center rounded-control text-fg-muted transition-colors hover:bg-sidebar-active hover:text-fg"
      >
        {collapsed ? (
          <PanelLeftOpen size={16} strokeWidth={1.75} />
        ) : (
          <PanelLeftClose size={16} strokeWidth={1.75} />
        )}
      </button>

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
