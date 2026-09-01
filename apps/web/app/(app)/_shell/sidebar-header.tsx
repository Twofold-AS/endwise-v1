'use client';

import { PanelLeftClose, PanelLeftOpen } from '@endwise/ui';
import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { useSidebarState } from './sidebar-state';

/** Logo og forhandlernavn på én rad, samme høyde. Ikke en caption under merket. */
const LOGO = 32;

/**
 * Sidebar-topp uten visningsvelger. Ett skall per innlogging.
 * Minimize bor her. Ingen divider under headeren.
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
  const { toggle, phoneOpen, closePhone } = useSidebarState();
  const minimer = (
    <button
      type="button"
      onClick={phoneOpen ? closePhone : toggle}
      aria-label={
        phoneOpen ? 'Lukk sidebaren' : collapsed ? 'Utvid sidebaren' : 'Gjør sidebaren mindre'
      }
      title={phoneOpen ? 'Lukk sidebaren' : collapsed ? 'Utvid sidebaren' : 'Gjør sidebaren mindre'}
      aria-expanded={phoneOpen ? true : !collapsed}
      data-phone-sidebar-close={phoneOpen ? '' : undefined}
      className="flex size-8 shrink-0 items-center justify-center rounded-control text-fg-muted transition-colors hover:bg-sidebar-active hover:text-fg"
    >
      {collapsed && !phoneOpen ? (
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
          className={`flex min-w-0 items-center gap-2 rounded-control text-fg hover:bg-sidebar-active/60 ${
            collapsed ? 'justify-center px-0' : 'px-1'
          }`}
        >
          <Image
            src="/logo/logo.svg"
            alt=""
            width={LOGO}
            height={LOGO}
            className="logo-invert shrink-0"
          />
          {!collapsed && (
            <span className="flex h-8 min-w-0 flex-1 items-center truncate text-title">
              Tilbake til Endwise
            </span>
          )}
        </Link>
        {minimer}
      </div>
    );
  }

  return (
    <div
      className={`flex w-full items-center gap-2 ${collapsed ? 'justify-center' : 'px-1'}`}
      title={navn}
    >
      <Image
        src="/logo/logo.svg"
        alt="Endwise"
        width={LOGO}
        height={LOGO}
        className="logo-invert shrink-0"
      />
      {!collapsed && (
        <span className="flex h-8 min-w-0 flex-1 items-center truncate text-title text-fg">
          {navn}
        </span>
      )}
      {minimer}
    </div>
  );
}
