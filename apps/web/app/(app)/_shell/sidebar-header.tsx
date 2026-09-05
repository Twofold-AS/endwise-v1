'use client';

import { PanelLeftClose, PanelLeftOpen } from '@endwise/ui';
import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { RonnyAvatarKnapp } from '../_workshop/ronny-avatar-knapp';
import { SHELL_LOGO_PX, SHELL_LOGO_WRAP, SHELL_TOGGLE_PX } from './phone-chrome';
import { useSidebarState } from './sidebar-state';

/** Logo 24px. Toggle-ikon 16px i 24px trefflate. */
const LOGO = SHELL_LOGO_PX;

/**
 * Sidebar-topp uten visningsvelger. Ett skall per innlogging.
 * Logo venstre. Høyre: Ronny-avatar (desktop) rett til venstre for lukk/åpne.
 */
export function SidebarHeader({
  navn,
  inspect,
  inspectTilbakeHref,
}: {
  navn: string;
  inspect?: boolean;
  inspectTilbakeHref?: string;
}) {
  const { toggle, phoneOpen, closePhone, open } = useSidebarState();
  const minimer = (
    <button
      type="button"
      onClick={phoneOpen ? closePhone : toggle}
      aria-label={phoneOpen || open ? 'Lukk sidebaren' : 'Åpne sidebaren'}
      title={phoneOpen || open ? 'Lukk sidebaren' : 'Åpne sidebaren'}
      aria-expanded={phoneOpen ? true : open}
      data-phone-sidebar-close={phoneOpen ? '' : undefined}
      className="flex size-6 shrink-0 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-inset hover:text-fg"
    >
      {open || phoneOpen ? (
        <PanelLeftClose size={SHELL_TOGGLE_PX} strokeWidth={1.75} />
      ) : (
        <PanelLeftOpen size={SHELL_TOGGLE_PX} strokeWidth={1.75} />
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
      <div className="flex w-full items-center justify-between gap-2">
        <Link
          href={(inspectTilbakeHref ?? '/endwise') as Route}
          data-shell-logo
          className={`${SHELL_LOGO_WRAP} min-w-0 gap-2 rounded-lg text-fg hover:bg-inset`}
        >
          <Image
            src="/logo/logo.svg"
            alt=""
            width={LOGO}
            height={LOGO}
            className="logo-invert shrink-0"
          />
          <span className="flex h-8 min-w-0 flex-1 items-center truncate text-title">
            Tilbake til Endwise
          </span>
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
