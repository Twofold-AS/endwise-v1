'use client';

import { PanelLeftOpen } from '@endwise/ui';
import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useOrgRole } from '../_lib/use-org-role';
import { shellForBruker } from './nav';
import {
  PHONE_LOGO_PX,
  SHELL_HEADER_RAD,
  SHELL_LOGO_WRAP,
  SHELL_TOGGLE_PX,
} from './phone-chrome';
import { erPhoneHjem, PHONE_SAFE_TOP, phoneHjemHref } from './phone-home';
import { useSidebarState } from './sidebar-state';
import { TilbakePil } from './tilbake-pil';

/**
 * Fast toppbar på telefon. Overlay-lås (logo / tilbake / åpne sidebar)
 * er mobil. Desktop har persistent skinne — denne baren er `md:hidden`.
 */
export function PhoneShell() {
  const pathname = usePathname() ?? '';
  const search = useSearchParams()?.toString() ?? '';
  const router = useRouter();
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
    <header
      data-phone-top-bar
      className={`sticky top-0 z-20 shrink-0 bg-bg md:hidden ${PHONE_SAFE_TOP}`}
    >
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
        <button
          type="button"
          data-phone-sidebar-open
          aria-label="Åpne sidebaren"
          title="Åpne sidebaren"
          className="flex size-8 shrink-0 items-center justify-center rounded-control text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring"
          onClick={openPhone}
        >
          <PanelLeftOpen size={SHELL_TOGGLE_PX} strokeWidth={1.75} />
        </button>
        {hjem ? null : (
          <button
            type="button"
            data-shell-tilbake
            aria-label="Tilbake"
            title="Tilbake"
            className="inline-flex h-control items-center rounded-control px-2"
            onClick={() => router.back()}
          >
            <TilbakePil />
          </button>
        )}
      </div>
    </header>
  );
}
