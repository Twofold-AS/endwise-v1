'use client';

import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { RonnyAvatarKnapp } from '../_workshop/ronny-avatar-knapp';
import { SHELL_LOGO_PX, SHELL_LOGO_WRAP } from './phone-chrome';

/** Logo 24px i header-fila; desktop wrapper skalerer merket til 30px. */
const LOGO = SHELL_LOGO_PX;

/**
 * Sidebar-topp uten visningsvelger. Ett skall per innlogging.
 * Logo venstre. Høyre: Ronny-avatar (desktop). Ingen collapse/expand
 * på desktop — telefon-overlay lukkes fra PhoneShell.
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
  const hoyre = (
    <div className="flex shrink-0 items-center">
      <RonnyAvatarKnapp />
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
