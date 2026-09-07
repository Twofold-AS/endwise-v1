'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { isVerkstedInspectPath } from '../_lib/plattform';
import { useOrgRole } from '../_lib/use-org-role';
import { RONNY_PHONE_IDLE, RonnyBot, useRonnySpinn } from '../_workshop/ronny-bot';
import { useRonnySheet } from '../_workshop/ronny-sheet-state';
import { destinasjonerForShell, isItemActive, shellForBruker } from './nav';
import { PHONE_AVATAR_PX, PHONE_LOGO_PX } from './phone-chrome';
import { PhoneHScroll } from './phone-h-scroll';
import { PHONE_SAFE_TOP, phoneHjemHref, phoneInnstillingerHref } from './phone-home';
import { PhoneSokOverlay } from './phone-sok-overlay';

const HIT = 'inline-flex size-7 shrink-0 items-center justify-center rounded-full text-fg';
const SIRKEL =
  'inline-flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 text-label text-fg';

/**
 * Telefon-chrome (Mikael 07.09.2026): to toppbarer, sidebar skjult.
 * Bar 1: merke · Mobbin-søk · Ronny-sirkel · profil-sirkel (samme mål).
 * Bar 2: dest-piller fra destinasjonerForShell (FORHANDLER_NAV). Aktiv = canvas-soft,
 * uten pip / border-left. Hårlinje under bar 2. Desktop: `md:hidden`.
 */
export function PhoneShell() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { role, navn, jobbfunksjon, isMechanic, erPlattform, shopEnabled } = useOrgRole();
  const { apen, apne, lukk } = useRonnySheet();
  const { spin, trigg } = useRonnySpinn();
  const [sok, setSok] = useState('');
  const [sokApen, setSokApen] = useState(false);
  const shell = shellForBruker({
    role,
    jobFunction: jobbfunksjon,
    isMechanic,
    erPlattform,
  });
  const hjemHref = phoneHjemHref(shell);
  const inspect = isVerkstedInspectPath(pathname);
  const dest = useMemo(
    () =>
      destinasjonerForShell({
        shell,
        role,
        shopEnabled,
        erPlattform,
        inspect,
      }),
    [shell, role, shopEnabled, erPlattform, inspect],
  );
  const q = sok.trim().toLowerCase();
  const vist = q ? dest.filter((i) => i.label.toLowerCase().includes(q)) : dest;
  const bokstav = profilBokstav(navn);

  return (
    <>
      <div data-phone-top-bar-spacer className={`shrink-0 md:hidden ${PHONE_SAFE_TOP}`} aria-hidden>
        <div className="h-row" />
        <div className="h-row" />
        <div className="h-px bg-border" />
      </div>
      <header
        data-phone-top-bar
        className={`fixed inset-x-0 top-0 z-[60] shrink-0 bg-bg md:hidden ${PHONE_SAFE_TOP}`}
      >
        <div
          data-phone-top-bar="1"
          data-shell-header
          className="flex h-row w-full items-center gap-2 px-3"
        >
          <Link
            href={hjemHref as Route}
            aria-label="Hjem"
            data-shell-logo
            className="inline-flex shrink-0 items-center"
          >
            <span
              aria-hidden
              className="inline-flex shrink-0 bg-fg"
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
          </Link>
          <form
            className="min-w-0 flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              const forste = vist[0];
              if (forste) router.push(forste.href as Route);
            }}
          >
            <input
              data-phone-search
              type="search"
              value={sok}
              onChange={(e) => setSok(e.target.value)}
              onFocus={() => setSokApen(true)}
              placeholder="Søk"
              aria-label="Søk destinasjoner"
              className="h-8 w-full rounded-sm border-0 bg-inset px-3 text-label text-fg placeholder:text-fg-faint outline-none focus-visible:outline-2 focus-visible:outline-ring"
            />
          </form>
          <button
            type="button"
            data-ronny-avatar
            aria-label={apen ? 'Lukk Ronny' : 'Åpne Ronny'}
            aria-expanded={apen}
            className={HIT}
            onClick={() => {
              trigg();
              if (apen) lukk();
              else apne();
            }}
          >
            <RonnyBot
              size={PHONE_AVATAR_PX}
              paper="var(--ew-bg)"
              spin={spin}
              idleSett={RONNY_PHONE_IDLE}
            />
          </button>
          <Link
            href={phoneInnstillingerHref(shell) as Route}
            data-phone-profile
            aria-label="Profil"
            className={SIRKEL}
          >
            {bokstav}
          </Link>
        </div>
        <div data-phone-top-bar="2" className="flex h-row w-full min-w-0 items-center px-3">
          <PhoneHScroll lockKey={`${pathname}|${q}`}>
            {vist.map((item) => {
              const aktiv = isItemActive(item, pathname);
              return (
                <Link
                  key={item.key}
                  href={item.href as Route}
                  aria-current={aktiv ? 'page' : undefined}
                  data-phone-dest={item.key}
                  className={`inline-flex h-8 shrink-0 items-center rounded-full px-3 text-label text-fg ${
                    aktiv ? 'bg-sidebar-active' : 'hover:bg-sidebar-active/60'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </PhoneHScroll>
        </div>
        <div data-phone-chrome-hairline className="h-px bg-border" />
      </header>
      <PhoneSokOverlay
        apen={sokApen}
        verdi={sok}
        onVerdi={setSok}
        onAvbryt={() => {
          setSokApen(false);
          setSok('');
        }}
        dest={dest}
        onVelg={(href) => {
          setSokApen(false);
          router.push(href as Route);
        }}
      />
    </>
  );
}

function profilBokstav(navn: string | null): string {
  const tegn = navn?.trim().charAt(0);
  return tegn ? tegn.toLocaleUpperCase('nb-NO') : '?';
}
