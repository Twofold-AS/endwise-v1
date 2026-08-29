'use client';

import { ChevronLeft } from '@endwise/ui';
import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { useOrgRole } from '../_lib/use-org-role';
import { BrukerRad } from './bruker-rad';
import { breadcrumbFor, contextForPath, shellForBruker } from './nav';
import { PHONE_LOGO_PX } from './phone-chrome';
import { erPhoneHjem, PHONE_SAFE_BUNN, PHONE_SAFE_TOP, phoneHjemHref } from './phone-home';

async function loggUt() {
  await authClient.signOut();
  window.location.assign('/signin');
}

/**
 * Telefon-chrome: hvit topp med logo over kortene, bevel under innholdet.
 * Ingen horisontal scroller, hamburger, Mer-sheet, visningsvelger eller bunnbar.
 * Innstillinger bor i bevelen: avatar + navn + logg ut, uten rolletittel.
 */
export function PhoneShell() {
  const pathname = usePathname() ?? '';
  const search = useSearchParams()?.toString() ?? '';
  const { role, jobbfunksjon, isMechanic, erPlattform } = useOrgRole();
  const shell = shellForBruker({
    role,
    jobFunction: jobbfunksjon,
    isMechanic,
    erPlattform,
  });
  const hjem = erPhoneHjem(pathname, search, shell);
  const hjemHref = phoneHjemHref(shell);
  const tittel = breadcrumbFor(pathname, search, contextForPath(pathname))[0]?.label ?? 'Endwise';

  return (
    <header className={`shrink-0 bg-bg md:hidden ${PHONE_SAFE_TOP}`}>
      <div className="flex h-row items-center px-3">
        <Link href={hjemHref as Route} aria-label="Hjem">
          <Image
            src="/logo/logo.svg"
            alt="Endwise"
            width={PHONE_LOGO_PX}
            height={PHONE_LOGO_PX}
            priority
          />
        </Link>
      </div>
      {hjem ? null : (
        <div className="flex h-row items-center gap-2 border-border border-b px-3">
          <Link
            href={hjemHref as Route}
            className="inline-flex h-control items-center gap-1 rounded-control px-2 text-label text-fg"
          >
            <ChevronLeft size={16} strokeWidth={1.75} />
            Tilbake
          </Link>
          <h1 className="truncate text-title text-fg">{tittel}</h1>
        </div>
      )}
    </header>
  );
}

export function PhoneBevel() {
  const { navn, isLoading } = useOrgRole();
  return (
    <footer className={`shrink-0 bg-bg px-3 pt-2 md:hidden ${PHONE_SAFE_BUNN}`}>
      <BrukerRad navn={navn} laster={isLoading} collapsed={false} onLoggUt={loggUt} />
    </footer>
  );
}
