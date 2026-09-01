'use client';

import { ChevronLeft, PanelLeftOpen } from '@endwise/ui';
import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useOrgRole } from '../_lib/use-org-role';
import { shellForBruker } from './nav';
import { PHONE_LOGO_PX, SHELL_HEADER_RAD, SHELL_LOGO_WRAP } from './phone-chrome';
import { erPhoneHjem, PHONE_SAFE_TOP, phoneHjemHref } from './phone-home';
import { useSidebarState } from './sidebar-state';

/**
 * Fast toppbar på telefon og desktop (alltid synlig når overlay er lukket).
 * Logo til venstre (18px, samme som sidebar-overlay). Åpne-sidebar-ikon ytterst til høyre.
 * Ingen persistent desktop-skinne. Ingen bevel, ingen hamburger-drawer, ingen Mer-ark.
 */
export function PhoneShell() {
  const pathname = usePathname() ?? '';
  const search = useSearchParams()?.toString() ?? '';
  const { role, jobbfunksjon, isMechanic, erPlattform } = useOrgRole();
  const { openPhone } = useSidebarState();
  const shell = shellForBruker({
    role,
    jobFunction: jobbfunksjon,
    isMechanic,
    erPlattform,
  });
  const hjem = erPhoneHjem(pathname, search, shell);
  const hjemHref = phoneHjemHref(shell);

  return (
    <header data-phone-top-bar className={`sticky top-0 z-20 shrink-0 bg-bg ${PHONE_SAFE_TOP}`}>
      <div data-shell-header className={SHELL_HEADER_RAD}>
        <Link
          href={hjemHref as Route}
          aria-label="Hjem"
          data-shell-logo
          className={SHELL_LOGO_WRAP}
        >
          <Image
            src="/logo/logo.svg"
            alt="Endwise"
            width={PHONE_LOGO_PX}
            height={PHONE_LOGO_PX}
            priority
            className="logo-invert"
          />
        </Link>
        {hjem ? null : (
          <Link
            href={hjemHref as Route}
            className="inline-flex h-control items-center gap-1 rounded-control px-2 text-label text-fg"
          >
            <ChevronLeft size={16} strokeWidth={1.75} />
            Tilbake
          </Link>
        )}
        <button
          type="button"
          data-phone-sidebar-open
          aria-label="Åpne sidebaren"
          title="Åpne sidebaren"
          className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-control text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring"
          onClick={openPhone}
        >
          <PanelLeftOpen size={18} strokeWidth={1.75} />
        </button>
      </div>
    </header>
  );
}
