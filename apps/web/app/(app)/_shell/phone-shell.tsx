'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { isVerkstedInspectPath } from '../_lib/plattform';
import { useOrgRole } from '../_lib/use-org-role';
import { RONNY_PHONE_IDLE, RonnyBot, useRonnySpinn } from '../_workshop/ronny-bot';
import { useRonnySheet } from '../_workshop/ronny-sheet-state';
import { InboxTopBar2 } from '../innboks/_top-bar2';
import { destinasjonerForShell, isItemActive, shellForBruker } from './nav';
import {
  PHONE_AVATAR_PX,
  PHONE_BAR2,
  PHONE_LOGO_PX,
  PHONE_PROFIL_SIRKEL,
  PHONE_RONNY_SIRKEL,
  PHONE_SIDE_UNDER,
  ronnySizeForSirkel,
} from './phone-chrome';
import { PhoneHScroll } from './phone-h-scroll';
import { PHONE_SAFE_TOP, phoneHjemHref, phoneInnstillingerHref } from './phone-home';
import { PhoneProfilMeny } from './phone-profil-meny';
import { phoneSideChrome } from './phone-side-chrome';
import { PhoneSokFelt } from './phone-sok-felt';
import { PhoneSokOverlay } from './phone-sok-overlay';

/**
 * Telefon-chrome: original toppbar 1 (logo · søk · Ronny · profil) og
 * toppbar 2 (dest-piller) alltid synlige — også på undersider.
 * Tittel + verktøylinje sitter tett under dest-pillene.
 * Ingen tilbake+midtstilt tittel som erstatter destinasjonsbarene.
 */
export function PhoneShell() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const params = useSearchParams();
  const { role, navn, epost, jobbfunksjon, isMechanic, erPlattform, isAdmin, shopEnabled } =
    useOrgRole();
  const { apen, apne, lukk } = useRonnySheet();
  const { spin, trigg } = useRonnySpinn();
  const [sok, setSok] = useState('');
  const [sokApen, setSokApen] = useState(false);
  const [profilApen, setProfilApen] = useState(false);
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
  const sideChrome = phoneSideChrome(pathname, params, {
    isAdmin,
    erForhandler: !erPlattform,
  });
  const bokstav = profilBokstav(navn);
  const profilHref = phoneInnstillingerHref(shell);

  return (
    <>
      <div data-phone-top-bar-spacer className={`shrink-0 md:hidden ${PHONE_SAFE_TOP}`} aria-hidden>
        <div className="h-row" />
        <div className={PHONE_BAR2} />
        {sideChrome ? (
          <div className={PHONE_SIDE_UNDER}>
            <div className="h-6" />
            <div className="h-8" />
          </div>
        ) : null}
        <div className="h-px bg-border" />
      </div>
      <header
        data-phone-top-bar
        className={`fixed inset-x-0 top-0 z-[60] shrink-0 bg-bg md:hidden ${PHONE_SAFE_TOP}`}
      >
        <div className="relative">
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
              data-phone-search
              className="min-w-0 flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                setSokApen(true);
              }}
            >
              <PhoneSokFelt
                value={sok}
                onChange={(e) => setSok(e.target.value)}
                onFocus={() => setSokApen(true)}
              />
            </form>
            <button
              type="button"
              data-ronny-avatar
              aria-label={apen ? 'Lukk Ronny' : 'Åpne Ronny'}
              aria-expanded={apen}
              className={PHONE_RONNY_SIRKEL}
              onClick={() => {
                trigg();
                if (apen) lukk();
                else apne();
              }}
            >
              <RonnyBot
                size={ronnySizeForSirkel(PHONE_AVATAR_PX)}
                spin={spin}
                idleSett={RONNY_PHONE_IDLE}
              />
            </button>
            <button
              type="button"
              data-phone-profile
              aria-label="Profil"
              aria-expanded={profilApen}
              className={PHONE_PROFIL_SIRKEL}
              onClick={() => setProfilApen((v) => !v)}
            >
              {bokstav}
            </button>
          </div>
          <PhoneProfilMeny
            apen={profilApen}
            onLukk={() => setProfilApen(false)}
            navn={navn}
            epost={epost}
            innstillingerHref={profilHref}
          />
        </div>
        <div data-phone-top-bar="2" className={PHONE_BAR2}>
          <PhoneHScroll lockKey={`${pathname}|${sok}`}>
            {dest.map((item) => {
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
        {sideChrome ? (
          <div
            data-phone-side-under
            data-phone-side-chrome={sideChrome.id}
            className={PHONE_SIDE_UNDER}
          >
            <h1 data-phone-side-tittel className="truncate text-title font-[650] leading-6 text-fg">
              {sideChrome.tittel}
            </h1>
            <div data-phone-side-verktoy className="flex min-h-8 min-w-0 items-end">
              {sideChrome.bar2 === 'innboks' ? (
                <InboxTopBar2 />
              ) : (
                <nav
                  data-phone-settings-nav
                  data-phone-side-nav={sideChrome.id}
                  aria-label={sideChrome.tittel}
                  className="flex min-w-0 flex-1 items-end gap-5 overflow-x-auto"
                >
                  {sideChrome.faner.map((f) => {
                    const aktiv = f.id === sideChrome.aktiv;
                    return (
                      <Link
                        key={f.id}
                        href={f.href as Route}
                        data-phone-settings-fane={f.id}
                        aria-current={aktiv ? 'page' : undefined}
                        className={`shrink-0 border-b-2 pb-1 text-label ${
                          aktiv
                            ? 'border-fg font-[650] text-fg'
                            : 'border-transparent text-fg-muted'
                        }`}
                      >
                        {f.label}
                      </Link>
                    );
                  })}
                </nav>
              )}
            </div>
          </div>
        ) : null}
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
