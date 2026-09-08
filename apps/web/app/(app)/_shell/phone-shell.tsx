'use client';

import { Search } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { isVerkstedInspectPath } from '../_lib/plattform';
import { useOrgRole } from '../_lib/use-org-role';
import { RONNY_PHONE_IDLE, RonnyBot, useRonnySpinn } from '../_workshop/ronny-bot';
import { useRonnySheet } from '../_workshop/ronny-sheet-state';
import { type FaneId, innstillingerHref, parseFane, synligeFaner } from '../innstillinger/_faner';
import { destinasjonerForShell, erSettingsSti, isItemActive, shellForBruker } from './nav';
import {
  PHONE_AVATAR_PX,
  PHONE_BAR2,
  PHONE_LOGO_PX,
  PHONE_PROFIL_SIRKEL,
  PHONE_RONNY_SIRKEL,
  ronnySizeForSirkel,
} from './phone-chrome';
import { PhoneHScroll } from './phone-h-scroll';
import { PHONE_SAFE_TOP, phoneHjemHref, phoneInnstillingerHref } from './phone-home';
import { PhoneProfilMeny } from './phone-profil-meny';
import { PhoneSokOverlay } from './phone-sok-overlay';
import { TilbakePil } from './tilbake-pil';

/**
 * Telefon-chrome (Mikael 08.09.2026): to toppbarer, sidebar skjult.
 * Bar 1: merke · Mobbin-søk · Ronny-sirkel · profil-sirkel (samme size-7 / 28px).
 * På Innstillinger: tilbake · tittel · Ronny · profil.
 * Bar 2: dest-piller, eller settings-nav med underline på aktiv.
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
  const innstillinger = erSettingsSti(pathname);
  const settingsFaner = synligeFaner(isAdmin, !erPlattform);
  const aktivFane: FaneId = parseFane(
    params?.get('fane') ?? (pathname.includes('/varsler') ? 'varsler' : 'profil'),
    isAdmin,
    'profil',
    !erPlattform,
  );
  const bokstav = profilBokstav(navn);
  const profilHref = phoneInnstillingerHref(shell);

  return (
    <>
      <div data-phone-top-bar-spacer className={`shrink-0 md:hidden ${PHONE_SAFE_TOP}`} aria-hidden>
        <div className="h-row" />
        <div className={PHONE_BAR2} />
        <div className="h-px bg-border" />
      </div>
      <header
        data-phone-top-bar
        className={`fixed inset-x-0 top-0 z-[60] shrink-0 bg-bg md:hidden ${PHONE_SAFE_TOP}`}
      >
        <div className="relative">
          {innstillinger ? (
            <div
              data-phone-top-bar="1"
              data-shell-header
              className="flex h-row w-full items-center gap-2 px-3"
            >
              <button
                type="button"
                data-shell-tilbake
                aria-label="Tilbake"
                className="inline-flex size-8 shrink-0 items-center justify-start text-fg"
                onClick={() => router.push(hjemHref as Route)}
              >
                <TilbakePil size={20} />
              </button>
              <p className="min-w-0 flex-1 truncate text-title text-fg">Innstillinger</p>
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
                  paper="var(--ew-bg)"
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
          ) : (
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
                  setSokApen(true);
                }}
              >
                <label className="relative block">
                  <Search
                    size={16}
                    strokeWidth={1.75}
                    data-phone-sok-ikon
                    className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-fg"
                    aria-hidden
                  />
                  <input
                    data-phone-search
                    type="search"
                    value={sok}
                    onChange={(e) => setSok(e.target.value)}
                    onFocus={() => setSokApen(true)}
                    placeholder="Søk"
                    aria-label="Søk"
                    className="h-8 w-full rounded-sm border-0 bg-inset pr-3 pl-9 text-label text-fg placeholder:text-fg-faint outline-none focus-visible:outline-2 focus-visible:outline-ring"
                  />
                </label>
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
                  paper="var(--ew-bg)"
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
          )}
          <PhoneProfilMeny
            apen={profilApen}
            onLukk={() => setProfilApen(false)}
            navn={navn}
            epost={epost}
            innstillingerHref={profilHref}
          />
        </div>
        <div data-phone-top-bar="2" className={PHONE_BAR2}>
          {innstillinger ? (
            <nav
              data-phone-settings-nav
              aria-label="Innstillinger"
              className="flex min-w-0 flex-1 items-end gap-5 overflow-x-auto"
            >
              {settingsFaner.map((f) => {
                const aktiv = f.id === aktivFane;
                return (
                  <Link
                    key={f.id}
                    href={innstillingerHref(f.id) as Route}
                    data-phone-settings-fane={f.id}
                    aria-current={aktiv ? 'page' : undefined}
                    className={`shrink-0 border-b-2 pb-1 text-label ${
                      aktiv ? 'border-fg font-[650] text-fg' : 'border-transparent text-fg-muted'
                    }`}
                  >
                    {f.label}
                  </Link>
                );
              })}
            </nav>
          ) : (
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
          )}
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
