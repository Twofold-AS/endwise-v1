'use client';

import { ChevronLeft } from '@endwise/ui';
import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { useOrgRole } from '../_lib/use-org-role';
import { BrukerRad } from './bruker-rad';
import { erHjemHigFlate } from './hjem-hig';
import { shellForBruker } from './nav';
import { PHONE_LOGO_PX } from './phone-chrome';
import {
  erPhoneHjem,
  PHONE_SAFE_BUNN,
  PHONE_SAFE_TOP,
  phoneHjemHref,
  phoneInnstillingerHref,
} from './phone-home';

async function loggUt() {
  await authClient.signOut();
  window.location.assign('/signin');
}

/**
 * Telefon-chrome: logo-rad med safe-area. Tilbake sitter på samme rad, til høyre.
 * Bevel er siste barn i innholdskolonnen med mt-auto — nederst når
 * innholdet er kort, etter innholdet når det er langt. Ikke sticky/fixed.
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
  const hig = erHjemHigFlate(pathname, search, shell);
  const hjemHref = phoneHjemHref(shell);

  return (
    <header
      data-hjem-hig={hig ? 'on' : undefined}
      className={`shrink-0 bg-bg md:hidden ${PHONE_SAFE_TOP}`}
    >
      <div className="hjem-hig-logo-rad flex h-row items-center justify-between px-3">
        <Link href={hjemHref as Route} aria-label="Hjem">
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
            className="ml-auto inline-flex h-control items-center gap-1 rounded-control px-2 text-label text-fg"
          >
            <ChevronLeft size={16} strokeWidth={1.75} />
            Tilbake
          </Link>
        )}
      </div>
    </header>
  );
}

export function PhoneBevel() {
  const pathname = usePathname() ?? '';
  const search = useSearchParams()?.toString() ?? '';
  const { navn, isLoading, role, jobbfunksjon, isMechanic, erPlattform } = useOrgRole();
  const shell = shellForBruker({
    role,
    jobFunction: jobbfunksjon,
    isMechanic,
    erPlattform,
  });
  const hig = erHjemHigFlate(pathname, search, shell);
  return (
    <footer
      data-hjem-hig={hig ? 'on' : undefined}
      className={`mt-auto bg-bg px-3 pt-4 md:hidden ${PHONE_SAFE_BUNN}`}
    >
      <BrukerRad
        navn={navn}
        laster={isLoading}
        collapsed={false}
        onLoggUt={loggUt}
        innstillingerHref={phoneInnstillingerHref(shell)}
      />
    </footer>
  );
}
