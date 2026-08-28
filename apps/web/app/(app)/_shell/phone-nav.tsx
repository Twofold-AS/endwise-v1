'use client';

import type { LucideIcon } from '@endwise/ui';
import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import {
  isVerkstedInspectPath,
  remapHrefTilInspect,
  verkstedSlugFromPath,
} from '../_lib/plattform';
import { useOrgRole } from '../_lib/use-org-role';
import { CountBadge } from './cards';
import {
  FORHANDLER_NAV,
  isItemActive,
  itemsForRole,
  type NavItem,
  navForShell,
  settingsForShell,
  shellForBruker,
} from './nav';
import { PHONE_LOGO_KOLONNE, PHONE_LOGO_PX } from './phone-chrome';
import { PhoneHScroll } from './phone-h-scroll';

/**
 * Telefon: horisontal sidebar. Erstatter top-bar 1.
 * Samme destinasjoner som desktop. Hjelp er en vanlig knapp, ikke slider.
 * Ingen Handlinger — den bevelen er desktop-sidebar.
 * Hovedraden er h-row (40px-token) — større enn 32-raden, ikke 44.
 * Logo er pinnest til venstre. Valgt punkt scroller inntil logo.
 * End-spacer måles (clientWidth − aktivWidth) så siste punkt når samme plass.
 */
export function PhoneNav() {
  const pathname = usePathname() ?? '';
  const { role, jobbfunksjon, isMechanic, shopEnabled, erPlattform } = useOrgRole();
  const inspect = isVerkstedInspectPath(pathname);
  const inspectSlug = verkstedSlugFromPath(pathname);
  const shell = inspect
    ? 'forhandler'
    : shellForBruker({
        role,
        jobFunction: jobbfunksjon,
        isMechanic,
        erPlattform,
      });
  const navRolle = erPlattform
    ? role === 'endwise_support'
      ? 'endwise_support'
      : 'endwise_admin'
    : role;
  const items = inspect
    ? itemsForRole(FORHANDLER_NAV, 'dealer_admin', shopEnabled).map((item) => ({
        ...item,
        href: inspectSlug ? remapHrefTilInspect(item.href, inspectSlug) : item.href,
      }))
    : itemsForRole(navForShell(shell), navRolle, shopEnabled);
  const settingsNav = inspect ? null : settingsForShell(shell);

  const threads = trpc.messages.listThreads.useQuery(undefined, {
    enabled: Boolean(role) && shell !== 'endwise' && shell !== 'endwise_partner' && !inspect,
  });
  const support = trpc.messages.listPlatformSupport.useQuery(undefined, {
    enabled: Boolean(role) && (shell === 'endwise' || shell === 'endwise_partner') && !inspect,
    retry: false,
  });
  const helpdeskUlest = trpc.helpdesk.ulesteAntall.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: true,
  });

  const unread = useMemo(() => {
    if (shell === 'endwise' || shell === 'endwise_partner') {
      return (support.data ?? []).filter((t) => t.unread).length;
    }
    return (threads.data ?? []).reduce((sum, t) => sum + (t.unread ?? 0), 0);
  }, [shell, support.data, threads.data]);

  const settingsAktiv = settingsNav ? isItemActive(settingsNav, pathname) : false;

  return (
    <nav
      aria-label="Hovednavigasjon"
      className="flex h-row min-h-row shrink-0 touch-pan-x items-center overflow-y-hidden border-border border-b bg-sidebar"
    >
      <div className={PHONE_LOGO_KOLONNE}>
        <Image
          src="/logo/logo.svg"
          alt="Endwise"
          width={PHONE_LOGO_PX}
          height={PHONE_LOGO_PX}
          priority
        />
      </div>
      <PhoneHScroll lockKey={`${pathname}:${items.length}:${settingsAktiv ? 1 : 0}`} className="pr-3">
        {items.map((item) => (
          <PhoneRad
            key={item.key}
            item={item}
            pathname={pathname}
            unread={unread}
            helpdesk={helpdeskUlest.data ?? 0}
          />
        ))}
        {settingsNav ? (
          <Link
            href={settingsNav.href as Route}
            aria-current={settingsAktiv ? 'page' : undefined}
            className={`inline-flex h-row min-h-row shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control px-2.5 text-label ${
              settingsAktiv ? 'bg-sidebar-active text-fg' : 'text-fg hover:bg-surface-2'
            }`}
          >
            <Ikon icon={settingsNav.icon} active={settingsAktiv} />
            {settingsNav.label}
          </Link>
        ) : null}
      </PhoneHScroll>
    </nav>
  );
}

function PhoneRad({
  item,
  pathname,
  unread,
  helpdesk,
}: {
  item: NavItem;
  pathname: string;
  unread: number;
  helpdesk: number;
}) {
  const active = isItemActive(item, pathname);
  const count = item.badge === 'unread' ? unread : item.badge === 'helpdesk' ? helpdesk : 0;
  return (
    <Link
      href={item.href as Route}
      aria-current={active ? 'page' : undefined}
      className={`inline-flex h-row min-h-row shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control px-2.5 text-label ${
        active ? 'bg-sidebar-active text-fg' : 'text-fg hover:bg-surface-2'
      }`}
    >
      <Ikon icon={item.icon} active={active} />
      {item.label}
      <CountBadge count={count} label={item.badge === 'helpdesk' ? 'nye artikler' : 'uleste'} />
    </Link>
  );
}

function Ikon({ icon: I, active }: { icon: LucideIcon; active: boolean }) {
  return (
    <span className={`inline-flex shrink-0 ${active ? 'text-fg' : 'text-fg-muted'}`}>
      <I size={16} strokeWidth={1.75} />
    </span>
  );
}
