'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuHeader,
  DropdownMenuItem,
  DropdownMenuTrigger,
  type LucideIcon,
  Zap,
} from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import {
  isVerkstedInspectPath,
  remapHrefTilInspect,
  tilbakeHref,
  verkstedSlugFromPath,
} from '../_lib/plattform';
import { useOrgRole } from '../_lib/use-org-role';
import { BrukerRad } from './bruker-rad';
import { BEVEL, CountBadge, NewBadge } from './cards';
import {
  FORHANDLER_NAV,
  isItemActive,
  itemsForRole,
  type NavItem,
  navForShell,
  QUICK_ACTIONS,
  settingsForShell,
  shellForBruker,
} from './nav';
import { OppgraderPille } from './oppgrader-pille';
import { SHELL_HEADER_RAD } from './phone-chrome';
import { SidebarHeader } from './sidebar-header';
import { useSidebarState } from './sidebar-state';

/** Nav-ikoner 16px. */
const IKON = 16;

/**
 * Samme overlay-sidebar på telefon og desktop — lukket default, åpnes fra
 * toppbar-ikonet ved logoen. Ingen persistent desktop-skinne.
 * Hvit flate, ingen header-divider. Ingen avatar. Hjelp-TipCard er ute;
 * nederst sitter Grainient-oppgraderingspillen.
 */
export function Sidebar() {
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    navn,
    role,
    isMechanic,
    jobbfunksjon,
    tenantName,
    shopEnabled,
    isLoading: rolleLaster,
    erPlattform,
  } = useOrgRole();
  const inspect = isVerkstedInspectPath(pathname);
  const inspectSlug = verkstedSlugFromPath(pathname);
  const fra = searchParams?.get('fra') ?? null;
  const inspectTilbake = tilbakeHref(fra);
  const { collapsed, phoneOpen, closePhone } = useSidebarState();
  const smal = collapsed && !phoneOpen;

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
  const rawItems = inspect
    ? itemsForRole(FORHANDLER_NAV, 'dealer_admin', shopEnabled).map((item) =>
        remapNav(item, inspectSlug ?? '', fra),
      )
    : itemsForRole(navForShell(shell), navRolle, shopEnabled);
  const items = rawItems;
  const settingsNav = inspect ? null : settingsForShell(shell);

  const threads = trpc.messages.listThreads.useQuery(undefined, {
    enabled: Boolean(role) && shell !== 'endwise' && shell !== 'endwise_partner' && !inspect,
  });
  const support = trpc.messages.listPlatformSupport.useQuery(undefined, {
    enabled: Boolean(role) && (shell === 'endwise' || shell === 'endwise_partner') && !inspect,
    retry: false,
  });
  /**
   * Uleste hjelpeartikler. Egen, billig telling: badgen står på en rad
   * som rendres på hver side, og å hente 50 artikler for å telle dem ville vært
   * å laste innholdet for å vise et tall. Ingen lang staleTime: Ny og slideren
   * skal treffe nye artikler ved window-focus.
   */
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

  // K åpner quick actions — bare desktop. På telefon er Handlinger borte
  // (ingen bevel, ingen overflow). Dropdown portaler til body, så ⌘K
  // må ikke åpne den under md.
  const [quickOpen, setQuickOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        if (!window.matchMedia('(min-width: 768px)').matches) return;
        e.preventDefault();
        setQuickOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!phoneOpen) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePhone();
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [phoneOpen, closePhone]);

  /**
   * hard navigasjon, ikke `router.push`.
   * `router.push` beholder dokumentet — og dermed hele React Query-cachen med
   * forrige brukers kunder, meldinger og team. Logger noen andre inn på samme
   * maskin, ser de et glimt av data de ikke har tilgang til før de nye
   * spørringene lander. RLS hindrer at de henter noe nytt; den kan ikke tømme
   * en cache som allerede ligger i minnet.
   * En full sidelast river ned alt. Samme grep som innlogging og
   * kontekstbytte bruker, av samme grunn.
   */
  async function logout() {
    await authClient.signOut();
    window.location.assign('/signin');
  }

  return (
    <aside
      data-sidebar
      data-phone-sidebar={phoneOpen ? 'open' : 'closed'}
      className={`flex-col border-border border-r bg-[#ffffff] ${
        phoneOpen
          ? 'fixed inset-0 z-50 flex w-full pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]'
          : 'hidden'
      }`}
    >
      <div data-shell-header className={`shrink-0 ${SHELL_HEADER_RAD}`}>
        {/*
         * `dealerName` er ekte navn fra `tenants.name`. Placeholderen
         * «Endwise-forhandler» sto hardkodet her fram til — den var
         * ikke bare stygg, den var en påstand om hvor du er logget inn.
         */}
        <SidebarHeader
          collapsed={smal}
          navn={erPlattform ? 'Endwise' : (tenantName ?? '—')}
          inspect={inspect}
          inspectTilbakeHref={inspectTilbake}
        />
      </div>

      {/* Innhold */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 py-3">
        {shell === 'forhandler' && !inspect && (
          <DropdownMenu open={quickOpen} onOpenChange={setQuickOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                style={BEVEL}
                title={smal ? 'Handlinger (⌘K)' : undefined}
                className={`flex h-control w-full items-center gap-2 rounded-control text-label transition hover:brightness-[0.98] focus-visible:outline-2 focus-visible:outline-ring ${
                  smal ? 'justify-center px-0' : 'px-2.5'
                }`}
              >
                <Zap size={IKON} strokeWidth={1.75} className="shrink-0 text-accent-strong" />
                {!smal && (
                  <>
                    <span className="flex-1 text-left">Handlinger</span>
                    <kbd className="rounded-badge border border-border/60 px-1.5 font-mono text-[11px] text-fg-muted">
                      ⌘K
                    </kbd>
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" sideOffset={16} className="z-50">
              <DropdownMenuHeader>Handlinger</DropdownMenuHeader>
              {QUICK_ACTIONS.map((a) => (
                <DropdownMenuItem
                  key={a.href}
                  onSelect={() => {
                    if (phoneOpen) closePhone();
                    router.push(a.href as Route);
                  }}
                >
                  <a.icon size={IKON} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
                  <span className="flex-1">{a.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <nav
          aria-label="Hovednavigasjon"
          className="flex min-h-0 flex-1 flex-col gap-[4px] overflow-y-auto"
        >
          {items.map((item) => (
            <Fragment key={item.key}>
              {item.dividerBefore ? <hr className="my-1.5 h-px border-0 bg-border" /> : null}
              <NavRow
                item={item}
                pathname={pathname}
                unread={unread}
                helpdesk={helpdeskUlest.data ?? 0}
                collapsed={smal}
                onNavigate={phoneOpen ? closePhone : undefined}
              />
            </Fragment>
          ))}
          {items.length === 0 && !smal && (
            <p className="px-2.5 py-6 text-[12px] text-fg-muted leading-relaxed">
              {shell === 'forhandler' && !shopEnabled
                ? 'Ingen destinasjoner å vise.'
                : 'Tom foreløpig.'}
            </p>
          )}
        </nav>

        {/* Bunn: oppgraderingspille over profil/logg ut. Ingen Hjelp-TipCard. */}
        <div className="flex flex-col gap-3">
          {!smal && shell !== 'endwise' && shell !== 'endwise_partner' && <OppgraderPille />}
          <BrukerRad
            navn={navn}
            laster={rolleLaster}
            collapsed={smal}
            onLoggUt={logout}
            innstillingerHref={
              settingsNav?.href ??
              (shell === 'mekaniker' ? '/min-dag/meg' : '/innstillinger/profil')
            }
            onNavigate={phoneOpen ? closePhone : undefined}
          />
        </div>
      </div>
    </aside>
  );
}

/**
 * Én nav-rad, 32px. Piller bor på siden — raden er alltid en destinasjon.
 */
function NavRow({
  item,
  pathname,
  unread,
  helpdesk,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  unread: number;
  helpdesk: number;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const active = isItemActive(item, pathname);
  const count = item.badge === 'unread' ? unread : item.badge === 'helpdesk' ? helpdesk : 0;
  const teller = (
    <CountBadge count={count} label={item.badge === 'helpdesk' ? 'nye artikler' : 'uleste'} />
  );
  const innhold = (
    <>
      <Ikon icon={item.icon} active={active} />
      {!collapsed && (
        <>
          <span className="flex-1 truncate text-left">{item.label}</span>
          {item.isNew && <NewBadge />}
          {count > 0 ? teller : null}
        </>
      )}
    </>
  );

  return (
    <Link
      href={item.href as Route}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      onClick={onNavigate}
      className={`flex h-control w-full items-center gap-2.5 rounded-control text-label text-fg transition-colors ${
        collapsed ? 'justify-center px-0' : 'px-2.5'
      } ${active ? 'bg-sidebar-active' : 'hover:bg-sidebar-active/60'}`}
    >
      {innhold}
    </Link>
  );
}

function medFra(href: string, fra: string | null): string {
  if (!fra) return href;
  return `${href}${href.includes('?') ? '&' : '?'}fra=${encodeURIComponent(fra)}`;
}

function remapNav(item: NavItem, slug: string, fra: string | null): NavItem {
  return {
    ...item,
    href: medFra(remapHrefTilInspect(item.href, slug), fra),
    pills: item.pills?.map((c) => ({
      ...c,
      href: medFra(remapHrefTilInspect(c.href, slug), fra),
    })),
    children: item.children?.map((c) => ({
      ...c,
      href: medFra(remapHrefTilInspect(c.href, slug), fra),
    })),
  };
}

function Ikon({ icon: I, active }: { icon: LucideIcon; active: boolean }) {
  return (
    <span className={`inline-flex shrink-0 ${active ? 'text-fg' : 'text-fg-muted'}`}>
      <I size={IKON} strokeWidth={1.75} />
    </span>
  );
}
