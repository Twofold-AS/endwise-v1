'use client';

import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { SHELL_LOGO_PX, SHELL_LOGO_WRAP } from './phone-chrome';

/** Logo 24px i header-fila; desktop wrapper skalerer merket til 40px. */
const LOGO = SHELL_LOGO_PX;

/**
 * Sidebar-topp uten visningsvelger. Ett skall per innlogging.
 * Logo venstre. Ronny sitter i boks 3 (standby), ikke her.
 * Ingen collapse/expand på desktop — telefon-overlay lukkes fra PhoneShell.
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
      </div>
    );
  }

  return (
    <div className="flex w-full items-center gap-2">
      <span data-shell-logo className={SHELL_LOGO_WRAP} title={navn}>
        <Image
          src="/logo/logo.svg"
          alt="Endwise"
          width={LOGO}
          height={LOGO}
          className="logo-invert shrink-0"
        />
      </span>
    </div>
  );
}
