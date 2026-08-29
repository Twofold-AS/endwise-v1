'use client';

import { PanelLeftClose, PanelLeftOpen } from '@endwise/ui';
import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { useSidebarState } from './sidebar-state';

/**
 * Sidebar-topp uten visningsvelger. Ett skall per innlogging.
 * Minimize bor her, inne i sidebaren. Ingen «Forhandler»-undertekst.
 * Logo er samme logo.svg, bare mindre. logo-invert følger tema
 * (svart på lyst, hvit på mørkt) — samme klasse som context-switcher.
 */
export function SidebarHeader({
  collapsed,
  navn,
  inspect,
  inspectTilbakeHref,
}: {
  collapsed: boolean;
  navn: string;
  inspect?: boolean;
  inspectTilbakeHref?: string;
}) {
  const { toggle } = useSidebarState();
  const minimer = (
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
  );

  if (inspect) {
    return (
      <div className={`flex w-full items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
        <Link
          href={(inspectTilbakeHref ?? '/endwise') as Route}
          className={`flex min-w-0 items-center gap-2 rounded-control text-label text-fg hover:bg-sidebar-active/60 ${
            collapsed ? 'justify-center px-0' : 'px-1'
          }`}
        >
          <Image src="/logo/logo.svg" alt="" width={22} height={22} className="logo-invert" />
          {!collapsed && <span className="truncate">Tilbake til Endwise</span>}
        </Link>
        {!collapsed && minimer}
        {collapsed && minimer}
      </div>
    );
  }

  return (
    <div
      className={`flex w-full items-center gap-2 ${collapsed ? 'justify-center' : 'px-1'}`}
      title={navn}
    >
      <Image src="/logo/logo.svg" alt="Endwise" width={22} height={22} className="logo-invert" />
      {!collapsed && <span className="min-w-0 flex-1 truncate text-label text-fg">{navn}</span>}
      {minimer}
    </div>
  );
}
