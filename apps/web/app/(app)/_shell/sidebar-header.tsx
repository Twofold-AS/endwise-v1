'use client';

import { PanelLeftClose, PanelLeftOpen } from '@endwise/ui';
import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { RonnyAvatarKnapp } from '../_workshop/ronny-avatar-knapp';
import { SHELL_LOGO_PX, SHELL_LOGO_WRAP, SHELL_TOGGLE_PX } from './phone-chrome';
import { useSidebarState } from './sidebar-state';

/** Logo 24px. Toggle er 16px — samme som destinasjonsikonene i sidebaren. */
const LOGO = SHELL_LOGO_PX;

/**
 * Sidebar-topp uten visningsvelger. Ett skall per innlogging.
 * Logo venstre. Høyre: Ronny-avatar (desktop) rett til venstre for lukk/åpne.
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
        <PanelLeftOpen size={SHELL_TOGGLE_PX} strokeWidth={1.75} />
      ) : (
        <PanelLeftClose size={SHELL_TOGGLE_PX} strokeWidth={1.75} />
      )}
    </button>
  );
  const hoyre = (
    <div className="flex shrink-0 items-center">
      <RonnyAvatarKnapp />
      {minimer}
    </div>
  );

  if (inspect) {
    return (
      <div
        className={`flex w-full items-center justify-between gap-2 ${collapsed ? 'justify-center' : ''}`}
      >
        <Link
          href={(inspectTilbakeHref ?? '/endwise') as Route}
          data-shell-logo
          className={`${SHELL_LOGO_WRAP} min-w-0 gap-2 rounded-control text-fg hover:bg-sidebar-active/60 ${
            collapsed ? 'justify-center' : ''
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
        {hoyre}
      </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-between gap-2">
      <span data-shell-logo className={SHELL_LOGO_WRAP} title={navn}>
        <Image
          src="/logo/logo.svg"
          alt="Endwise"
          width={LOGO}
          height={LOGO}
          className="logo-invert shrink-0"
        />
      </span>
      {hoyre}
    </div>
  );
}
