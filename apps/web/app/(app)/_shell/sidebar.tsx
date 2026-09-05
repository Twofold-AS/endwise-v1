'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuHeader,
  DropdownMenuItem,
  DropdownMenuTrigger,
  type LucideIcon,
  Plus,
  SPRING_LAYOUT,
} from '@endwise/ui';
import { LayoutGroup, motion } from 'motion/react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { CountBadge, NewBadge } from './cards';
import {
  FORHANDLER_NAV,
  FORHANDLER_NAV_GRUPPER,
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
import {
  SIDEBAR_COLLAPSE_SLOP,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  useSidebarState,
} from './sidebar-state';

/** Nav-ikoner 16px. Ikon-knapper 24px. */
const IKON = 16;

/**
 * Desktop: Fluid inset + offcanvas. Ingen ikon-skinne — peek ved hover/klikk.
 * Telefon: modal drawer under toppbaren, persisteres aldri.
 */
export function Sidebar() {
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    navn,
    userId,
    role,
    isMechanic,
    jobbfunksjon,
    tenantName,
    shopEnabled,
    isLoading: rolleLaster,
    chromeFeilet,
    erPlattform,
  } = useOrgRole();
  const inspect = isVerkstedInspectPath(pathname);
  const inspectSlug = verkstedSlugFromPath(pathname);
  const fra = searchParams?.get('fra') ?? null;
  const inspectTilbake = tilbakeHref(fra);
  const {
    open,
    setOpen,
    phoneOpen,
    closePhone,
    width,
    setWidth,
    isPeeking,
    schedulePeek,
    scheduleUnpeek,
    cancelPeek,
  } = useSidebarState();

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
  const hoved = rawItems.filter((i) => i.group !== 'footer');
  const footer = rawItems.filter((i) => i.group === 'footer');
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

  useEffect(() => {
    if (open || !isPeeking) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') scheduleUnpeek();
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [open, isPeeking, scheduleUnpeek]);

  async function logout() {
    await authClient.signOut();
    window.location.assign('/signin');
  }

  const grupper =
    shell === 'forhandler'
      ? FORHANDLER_NAV_GRUPPER.map((g) => ({
          ...g,
          items: g.keys
            .map((k) => hoved.find((i) => i.key === k))
            .filter((i): i is NavItem => Boolean(i)),
        })).filter((g) => g.items.length > 0)
      : [{ id: 'alle', label: null as string | null, items: hoved }];

  const desktopSynlig = open || isPeeking;
  const peekOverlay = !open && isPeeking;

  return (
    <>
      {!open ? (
        <button
          type="button"
          data-sidebar-peek-edge
          aria-label="Vis sidebaren"
          className="fixed top-0 bottom-0 left-0 z-40 hidden w-3 md:block"
          onPointerEnter={schedulePeek}
          onPointerLeave={scheduleUnpeek}
          onClick={() => setOpen(true)}
        />
      ) : null}

      {phoneOpen ? (
        <button
          type="button"
          data-sidebar-scrim
          aria-label="Lukk sidebaren"
          className="fixed inset-x-0 bottom-0 z-40 bg-fg/20 md:hidden top-[calc(env(safe-area-inset-top)+var(--ew-row-h))]"
          onClick={closePhone}
        />
      ) : null}

      {peekOverlay ? (
        <button
          type="button"
          data-sidebar-peek-scrim
          aria-label="Lukk forhåndsvisning"
          className="fixed inset-0 z-40 hidden bg-fg/10 md:block"
          onClick={() => scheduleUnpeek()}
        />
      ) : null}

      <aside
        data-sidebar
        data-sidebar-variant="inset"
        data-sidebar-collapsible="offcanvas"
        data-sidebar-state={open ? 'expanded' : 'collapsed'}
        data-sidebar-peek={isPeeking ? '1' : undefined}
        data-phone-sidebar={phoneOpen ? 'open' : 'closed'}
        style={{ ['--sidebar-width' as string]: `${width}px` }}
        onPointerEnter={() => {
          if (!open) {
            cancelPeek();
            schedulePeek();
          }
        }}
        onPointerLeave={() => {
          if (!open) scheduleUnpeek();
        }}
        className={`flex-col bg-sidebar text-fg ${
          phoneOpen
            ? 'fixed inset-x-0 bottom-0 z-50 flex w-full bg-card top-[calc(env(safe-area-inset-top)+var(--ew-row-h))] pb-[env(safe-area-inset-bottom)] md:static md:inset-auto md:top-auto md:z-auto md:bg-sidebar'
            : 'hidden md:flex'
        } ${
          peekOverlay
            ? 'md:fixed md:inset-y-2 md:left-2 md:z-50 md:rounded-lg md:border md:border-border md:bg-card'
            : open
              ? 'md:relative md:z-auto'
              : 'md:hidden'
        }`}
      >
        <div
          className={`relative flex h-full min-h-0 flex-col ${desktopSynlig || phoneOpen ? '' : 'md:hidden'}`}
          style={phoneOpen ? undefined : { width }}
        >
          <div data-shell-header className={`hidden shrink-0 md:flex ${SHELL_HEADER_RAD}`}>
            <SidebarHeader
              navn={erPlattform ? 'Endwise' : (tenantName ?? '—')}
              inspect={inspect}
              inspectTilbakeHref={inspectTilbake}
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 py-3">
            <DropdownMenu open={quickOpen} onOpenChange={setQuickOpen}>
              <DropdownMenuTrigger asChild>
                <button type="button" className="sr-only" tabIndex={-1}>
                  Handlinger
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

            <LayoutGroup id="dealer-sidebar-active">
              <nav
                aria-label="Hovednavigasjon"
                className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto"
              >
                {grupper.map((gruppe) => (
                  <div key={gruppe.id} data-sidebar-group={gruppe.id} className="flex flex-col gap-1">
                    {gruppe.label ? (
                      <p className="px-2.5 text-[12px] text-fg-muted">{gruppe.label}</p>
                    ) : null}
                    <div className="flex flex-col gap-[4px]">
                      {gruppe.items.map((item) => (
                        <NavRow
                          key={item.key}
                          item={item}
                          pathname={pathname}
                          unread={unread}
                          helpdesk={helpdeskUlest.data ?? 0}
                          onNavigate={phoneOpen ? closePhone : undefined}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {hoved.length === 0 ? (
                  <p className="px-2.5 py-6 text-[12px] text-fg-muted leading-relaxed">
                    {chromeFeilet
                      ? 'Kunne ikke laste menyen. Prøv å oppdatere.'
                      : shell === 'forhandler' && !shopEnabled
                        ? 'Ingen destinasjoner å vise.'
                        : 'Tom foreløpig.'}
                  </p>
                ) : null}
              </nav>
            </LayoutGroup>

            <div className="flex min-w-0 flex-col gap-3">
              {footer.map((item) => (
                <NavRow
                  key={item.key}
                  item={item}
                  pathname={pathname}
                  unread={unread}
                  helpdesk={helpdeskUlest.data ?? 0}
                  onNavigate={phoneOpen ? closePhone : undefined}
                />
              ))}
              {shell !== 'endwise' && shell !== 'endwise_partner' && <OppgraderPille />}
              <BrukerRad
                navn={navn}
                userId={userId}
                laster={rolleLaster}
                onLoggUt={logout}
                innstillingerHref={
                  settingsNav?.href ??
                  (shell === 'mekaniker' ? '/min-dag/meg' : '/innstillinger/profil')
                }
                onNavigate={phoneOpen ? closePhone : undefined}
              />
            </div>
          </div>

          {open ? <SidebarResizeHandle width={width} setWidth={setWidth} setOpen={setOpen} /> : null}
        </div>
      </aside>
    </>
  );
}

function SidebarResizeHandle({
  width,
  setWidth,
  setOpen,
}: {
  width: number;
  setWidth: (px: number) => void;
  setOpen: (neste: boolean | ((forrige: boolean) => boolean)) => void;
}) {
  const start = useRef({ x: 0, w: width });

  return (
    <div
      data-sidebar-resize
      role="separator"
      aria-orientation="vertical"
      aria-valuemin={SIDEBAR_MIN_WIDTH}
      aria-valuemax={SIDEBAR_MAX_WIDTH}
      aria-valuenow={width}
      aria-label="Endre sidebaredde"
      className="absolute top-0 right-0 bottom-0 z-10 hidden w-2 cursor-col-resize touch-none md:block"
      onPointerDown={(e) => {
        e.preventDefault();
        start.current = { x: e.clientX, w: width };
        const el = e.currentTarget;
        el.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        const neste = start.current.w + (e.clientX - start.current.x);
        if (neste < SIDEBAR_MIN_WIDTH - SIDEBAR_COLLAPSE_SLOP) {
          setOpen(false);
          return;
        }
        setWidth(neste);
      }}
    />
  );
}

function NavRow({
  item,
  pathname,
  unread,
  helpdesk,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  unread: number;
  helpdesk: number;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const active = isItemActive(item, pathname);
  const count = item.badge === 'unread' ? unread : item.badge === 'helpdesk' ? helpdesk : 0;
  const teller = (
    <CountBadge count={count} label={item.badge === 'helpdesk' ? 'nye artikler' : 'uleste'} />
  );

  return (
    <div className="group/nav relative">
      {active ? (
        <motion.span
          layoutId="sidebar-traveling-bg"
          className="pointer-events-none absolute inset-0 rounded-lg bg-sidebar-active"
          transition={SPRING_LAYOUT}
        />
      ) : null}
      <div
        className={`relative z-10 flex h-control w-full items-center gap-2.5 rounded-lg px-2.5 text-label transition-colors ${
          active ? 'font-semibold text-sidebar-active-fg' : 'text-fg hover:bg-inset'
        }`}
      >
        <Link
          href={item.href as Route}
          aria-current={active ? 'page' : undefined}
          onClick={onNavigate}
          className="flex min-w-0 flex-1 items-center gap-2.5"
        >
          <Ikon icon={item.icon} active={active} />
          <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
        </Link>
        {item.isNew && <NewBadge />}
        {count > 0 ? teller : null}
        {item.hoverHref ? (
          <button
            type="button"
            title={item.hoverLabel}
            aria-label={item.hoverLabel}
            onClick={() => {
              onNavigate?.();
              router.push(item.hoverHref as Route);
            }}
            className="hidden size-6 items-center justify-center rounded-lg text-current opacity-0 transition-opacity group-hover/nav:inline-flex group-hover/nav:opacity-100 hover:bg-white/15"
          >
            <Plus size={IKON} strokeWidth={1.75} />
          </button>
        ) : null}
      </div>
    </div>
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
    hoverHref: item.hoverHref
      ? medFra(remapHrefTilInspect(item.hoverHref, slug), fra)
      : undefined,
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
    <span className={`inline-flex shrink-0 ${active ? 'text-sidebar-active-fg' : 'text-fg-muted'}`}>
      <I size={IKON} strokeWidth={1.75} />
    </span>
  );
}
