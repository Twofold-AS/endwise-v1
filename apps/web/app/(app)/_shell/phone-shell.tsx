'use client';

import { PanelLeftOpen } from '@endwise/ui';
import { BloubBot } from '@endwise/ui/bloub/BloubBot';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useOrgRole } from '../_lib/use-org-role';
import { useRonnySheet } from '../_workshop/ronny-sheet-state';
import { shellForBruker } from './nav';
import { PHONE_LOGO_PX, SHELL_TOGGLE_PX } from './phone-chrome';
import { erPhoneHjem, PHONE_SAFE_TOP, phoneHjemHref } from './phone-home';
import { useSidebarState } from './sidebar-state';
import { TilbakePil } from './tilbake-pil';

const HIT = 'inline-flex size-11 shrink-0 items-center justify-center rounded-control text-fg';

/**
 * Fast toppbar på telefon. Overlay-lås er mobil.
 * Logo midt (ink). Tilbake-pil med hale på undersider. Høyre: Ronny-avatar,
 * deretter sidebar-toggle ytterst. Desktop har persistent skinne — `md:hidden`.
 */
export function PhoneShell() {
  const pathname = usePathname() ?? '';
  const search = useSearchParams()?.toString() ?? '';
  const router = useRouter();
  const { role, jobbfunksjon, isMechanic, erPlattform } = useOrgRole();
  const { openPhone } = useSidebarState();
  const { apen, apne, lukk } = useRonnySheet();
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
      <div data-shell-header className="relative flex h-row w-full items-center px-3">
        <div className="relative z-10 flex min-w-11 items-center">
          {hjem ? null : (
            <button
              type="button"
              data-shell-tilbake
              aria-label="Tilbake"
              className={HIT}
              onClick={() => router.back()}
            >
              <TilbakePil />
            </button>
          )}
        </div>
        <Link
          href={hjemHref as Route}
          aria-label="Hjem"
          data-shell-logo
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <span className="pointer-events-auto inline-flex items-center gap-1.5 text-fg">
            <span
              aria-hidden
              className="shrink-0 bg-fg"
              style={{
                width: PHONE_LOGO_PX,
                height: PHONE_LOGO_PX,
                maskImage: 'url(/logo/logo.svg)',
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                maskPosition: 'center',
                WebkitMaskImage: 'url(/logo/logo.svg)',
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
              }}
            />
            <span className="text-title">Endwise</span>
          </span>
        </Link>
        <div className="relative z-10 ml-auto flex items-center">
          <button
            type="button"
            data-ronny-avatar
            aria-label={apen ? 'Lukk Ronny' : 'Åpne Ronny'}
            aria-expanded={apen}
            className={HIT}
            onClick={() => (apen ? lukk() : apne())}
          >
            <BloubBot
              size={28}
              shape="cercle"
              color="#1d1d1f"
              paper="#f5f5f7"
              state="idle"
              expression="heureux"
              follow={false}
              still
              playing={false}
            />
          </button>
          <button
            type="button"
            data-phone-sidebar-open
            aria-label="Åpne sidebaren"
            title="Åpne sidebaren"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-control text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring"
            onClick={openPhone}
          >
            <PanelLeftOpen size={SHELL_TOGGLE_PX} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </header>
  );
}
