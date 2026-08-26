'use client';

import {
  ChevronDown,
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
import { useEffect, useMemo, useState } from 'react';
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
import { ContextSwitcher } from './context-switcher';
import {
  CONTEXTS,
  type ContextKey,
  childrenForRole,
  contextForPath,
  contextsForRole,
  FORHANDLER_NAV,
  isItemActive,
  itemsForRole,
  type NavItem,
  navForContext,
  QUICK_ACTIONS,
  settingsForContext,
  stierFor,
} from './nav';
import { useSidebarState } from './sidebar-state';
import { TipCard } from './tip-card';

const ROLE_LABEL: Record<string, string> = {
  dealer_admin: 'Forhandler-admin',
  dealer_staff: 'Ansatt',
  endwise_admin: 'Endwise-admin',
  endwise_support: 'Endwise-support',
  customer: 'Kunde',
};

/** Nav-ikoner 16px. */
const IKON = 16;

/**
 * F5-13 — DEN DOMINERENDE SIDEBAREN.
 *
 * Header på nøyaktig 56px med `border-b`, samme høyde som topbaren, så
 * skillelinjene møtes på én y-verdi tvers over skjermen.
 *
 * ── Kollapset tilstand ─────────────────────────────────────────────────────
 * Knappen bor i topbaren (ved siden av breadcrumben), tilstanden i
 * `sidebar-state.tsx`. Kollapset viser headeren KUN merkeboksen, og nav-radene
 * blir ikon-only med `title` som fallback. Ingen tekst som brekker, ingen
 * ellipse — bare ikonene.
 *
 * ── To mønstre, med vilje (07.08.2026, Settings 25.08) ─────────────────────
 * **Flyout ut til siden** er for HANDLINGER: «Handlinger» (⌘K). Korte
 * lister du plukker fra og lukker igjen.
 *
 * **Inline utfolding** er for DESTINASJONER: Jobber, Kunder, Rapporter,
 * Organisasjon. De hører til strukturen du navigerer i, og skal
 * ikke skjule hvor du står. Se `NavRow`.
 *
 * Innstillinger er destinasjon (Link til profil), ikke flyout.
 */
export function Sidebar() {
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    navn,
    role,
    isMechanic,
    tenantName,
    devMode,
    shopEnabled,
    isLoading: rolleLaster,
    canSwitchDemo,
    erPlattform,
    verksteder,
    plattformTenantId,
  } = useOrgRole();
  const inspect = isVerkstedInspectPath(pathname);
  const inspectSlug = verkstedSlugFromPath(pathname);
  const fra = searchParams?.get('fra') ?? null;
  const inspectTilbake = tilbakeHref(fra);
  const { collapsed } = useSidebarState();

  const pathContext = contextForPath(pathname);
  const [chosen, setChosen] = useState<ContextKey | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathContext ER hele avhengigheten; setChosen er stabil
  useEffect(() => {
    setChosen(null);
  }, [pathContext]);
  /**
   * slug=endwise / kind=platform er plattform — også før setup har satt
   * Better Auth-rollen til endwise_admin. Ikke vis Forhandler/Lager fordi
   * rollen fortsatt er dealer_admin.
   */
  const context = inspect ? 'forhandler' : erPlattform ? 'endwise' : (chosen ?? pathContext);
  const contexts = erPlattform
    ? CONTEXTS.filter((c) => c.key === 'endwise')
    : contextsForRole(role, isMechanic, devMode, shopEnabled);
  const navRolle = erPlattform
    ? role === 'endwise_support'
      ? 'endwise_support'
      : 'endwise_admin'
    : role;
  const rawItems = inspect
    ? itemsForRole(FORHANDLER_NAV, 'dealer_admin').map((item) =>
        remapNav(item, inspectSlug ?? '', fra),
      )
    : itemsForRole(navForContext(context), navRolle);
  const items = rawItems;
  // Settings-blokka er ulik per kontekst: forhandlerens konfigurasjon i
  // forhandler-konteksten, dev-mode-bryteren i Endwise-admin. `null` i resten.
  const settingsNav = inspect ? null : settingsForContext(context);

  const threads = trpc.messages.listThreads.useQuery(undefined, {
    enabled: Boolean(role) && context !== 'endwise' && !inspect,
  });
  const support = trpc.messages.listPlatformSupport.useQuery(undefined, {
    enabled: Boolean(role) && context === 'endwise' && !inspect,
    retry: false,
  });
  /**
   * F5-23 — uleste hjelpeartikler. Egen, billig telling: badgen står på en rad
   * som rendres på hver side, og å hente 50 artikler for å telle dem ville vært
   * å laste innholdet for å vise et tall. Ingen lang staleTime: Ny og slideren
   * skal treffe nye artikler ved window-focus.
   */
  const helpdeskUlest = trpc.helpdesk.ulesteAntall.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: true,
  });

  /**
   * F5-13 — ⛔ ÉN ÅPEN OM GANGEN (accordion, 20.08.2026).
   *
   * ⚠️ Tilstanden MÅTTE flyttes hit. Hver `NavRow` hadde sin egen `open`, og
   * en rad som bare kjenner seg selv kan ikke vite at en annen skal lukkes —
   * derfor sto Kunder og Saker åpne samtidig og dyttet resten nedover.
   *
   * `null` = ingen åpen. Klikk på den åpne lukker den (samme knapp, begge
   * veier) — samme mønster som part-filtrene i innboksen bruker.
   */
  const [apentPunkt, setApentPunkt] = useState<string | null>(null);

  const unread = useMemo(() => {
    if (context === 'endwise') {
      return (support.data ?? []).filter((t) => t.unread).length;
    }
    return (threads.data ?? []).reduce((sum, t) => sum + (t.unread ?? 0), 0);
  }, [context, support.data, threads.data]);

  // ⌘K åpner quick actions.
  const [quickOpen, setQuickOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setQuickOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  /**
   * ⚠️ **HARD navigasjon, ikke `router.push`** (rettet 09.08.2026).
   *
   * `router.push` beholder dokumentet — og dermed hele React Query-cachen med
   * forrige brukers kunder, meldinger og team. Logger noen andre inn på samme
   * maskin, ser de et glimt av data de ikke har tilgang til før de nye
   * spørringene lander. RLS hindrer at de HENTER noe nytt; den kan ikke tømme
   * en cache som allerede ligger i minnet.
   *
   * En full sidelast river ned alt. Samme grep som innlogging og
   * kontekstbytte bruker, av samme grunn.
   */
  async function logout() {
    await authClient.signOut();
    window.location.assign('/signin');
  }

  const search = searchParams?.toString() ?? '';
  const settingsAktiv = settingsNav ? isItemActive(settingsNav, pathname) : false;

  return (
    <aside
      className={`flex shrink-0 flex-col border-border border-r bg-sidebar transition-[width] duration-150 ${
        collapsed ? 'w-[76px]' : 'w-[248px]'
      }`}
    >
      {/* ── Header: 56px + border-b ──────────────────────────────────── */}
      <div
        className={`flex h-14 shrink-0 items-center border-border border-b ${
          collapsed ? 'justify-center px-2' : 'px-3'
        }`}
      >
        {/* F5-26: `dealerName` er ekte navn fra `tenants.name`. Placeholderen
            «Endwise-forhandler» sto hardkodet her fram til 07.08.2026 — den var
            ikke bare stygg, den var en påstand om hvor du er logget inn. */}
        <ContextSwitcher
          contexts={contexts}
          active={inspect ? 'forhandler' : context}
          collapsed={collapsed}
          dealerName={tenantName ?? '—'}
          canSwitchDemo={canSwitchDemo && !inspect && !erPlattform}
          erPlattform={erPlattform}
          inspect={inspect}
          inspectTilbakeHref={inspectTilbake}
          verksteder={verksteder}
          plattformTenantId={plattformTenantId}
          onSelect={setChosen}
        />
      </div>

      {/* ── Innhold ──────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 py-3">
        {context === 'forhandler' && !inspect && (
          <DropdownMenu open={quickOpen} onOpenChange={setQuickOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                style={BEVEL}
                title={collapsed ? 'Handlinger (⌘K)' : undefined}
                className={`flex h-control w-full items-center gap-2 rounded-control text-label transition hover:brightness-[0.98] focus-visible:outline-2 focus-visible:outline-ring ${
                  collapsed ? 'justify-center px-0' : 'px-2.5'
                }`}
              >
                <Zap size={IKON} strokeWidth={1.75} className="shrink-0 text-accent-strong" />
                {!collapsed && (
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
                <DropdownMenuItem key={a.href} onSelect={() => router.push(a.href as Route)}>
                  <a.icon size={IKON} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
                  <span className="flex-1">{a.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <nav
          aria-label="Hovednavigasjon"
          className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto"
        >
          {items.map((item) => (
            <NavRow
              key={item.key}
              item={item}
              pathname={pathname}
              search={search}
              role={role}
              unread={unread}
              helpdesk={helpdeskUlest.data ?? 0}
              collapsed={collapsed}
              apen={apentPunkt === item.key}
              settApent={setApentPunkt}
            />
          ))}
          {items.length === 0 && !collapsed && (
            <p className="px-2.5 py-6 text-[12px] text-fg-muted leading-relaxed">
              {context === 'butikk'
                ? 'Butikk er stengt. Feature-flagget «shop» er av for denne forhandleren.'
                : 'Tom foreløpig. Endwise-internt innhold bygges gradvis; dagens /admin-sider er urørt, men bevisst ikke dratt inn hit.'}
            </p>
          )}
        </nav>

        {/* ── Bunn: tips-kort → divider → Settings → DEG ──────────────── */}
        {settingsNav && (
          <div className="flex flex-col gap-3">
            {/* Tips-kortet forklarer FORHANDLERENS begreper. I Endwise-admin
                ville det vært å forklare oss selv vårt eget produkt. */}
            {!collapsed && context === 'forhandler' && <TipCard />}

            {/* Går helt ut i kantene — `-mx-3` opphever kolonnens padding. */}
            <div className="-mx-3 h-px bg-border" />

            {/* Settings er destinasjon til profil — samme rad-chrome som
                Verkstedet/Innboks. Pille-fanene på /innstillinger eier
                undersidene. Kollapset 76px: ikon-lenke, samme mål. */}
            <Link
              href={settingsNav.href as Route}
              aria-current={settingsAktiv ? 'page' : undefined}
              title={collapsed ? settingsNav.label : undefined}
              className={`flex h-control w-full items-center gap-2.5 rounded-control text-label transition-colors ${
                collapsed ? 'justify-center px-0' : 'px-2.5'
              } ${settingsAktiv ? 'bg-sidebar-active text-fg' : 'text-fg hover:bg-sidebar-active/60'}`}
            >
              <Ikon icon={settingsNav.icon} active={settingsAktiv} />
              {!collapsed && <span className="flex-1 text-left">{settingsNav.label}</span>}
            </Link>

            {/* ── Deg. Nederst, under Innstillinger, som bestilt ─────────────── */}
            <BrukerRad
              /* Én identitet: internNavn via useOrgRole (kallenavn, ellers
                 visningsnavn). Ikke Better-Auth-navn som fallback. */
              navn={navn}
              rolle={role ? (ROLE_LABEL[role] ?? '—') : null}
              laster={rolleLaster}
              collapsed={collapsed}
              onLoggUt={logout}
            />
          </div>
        )}
      </div>
    </aside>
  );
}

/** Er dette underpunktet det aktive? Query teller når underpunktet bærer query. */
function isChildActive(href: string, pathname: string, search: string): boolean {
  const [cPath, cQuery] = href.split('?');
  const treff = stierFor(cPath ?? '').includes(pathname);
  if (cQuery) return treff && search.includes(cQuery);
  return treff && !search.includes('visning=');
}

/**
 * Én nav-rad, 32px.
 *
 * ── Underpunkter er INLINE igjen (07.08.2026, eiers beslutning) ────────────
 * Flyout ut til siden var riktig for **handlinger** (Handlinger) —
 * korte lister du plukker fra og lukker. Det var feil for **destinasjoner**:
 * en flyout skjuler hvor du er, og du mister følelsen av hvor i navet du står.
 *
 * Derfor: rader med underpunkter folder seg ut UNDER seg selv i selve
 * sidebaren. Raden er en knapp som åpner/lukker; underpunktene er lenkene.
 * Åpen som standard når raden er aktiv, så du alltid ser deg selv i strukturen.
 *
 * ⚠️ **Ett unntak, av nødvendighet:** i kollapset sidebar (76px) er det ingen
 * bredde å folde ut i. Der faller raden tilbake til flyouten. Alternativet
 * ville vært å skjule underpunktene helt, og da er de utilgjengelige.
 */
function NavRow({
  item,
  pathname,
  search,
  role,
  unread,
  helpdesk,
  collapsed,
  apen,
  settApent,
}: {
  item: NavItem;
  pathname: string;
  search: string;
  role: string | null;
  unread: number;
  helpdesk: number;
  collapsed: boolean;
  apen: boolean;
  /**
   * ⚠️ Setteren sendes inn RÅ, ikke pakket i en pil-funksjon per rad.
   * `useState`-settere er stabile mellom renders; en `(pa) => set(...)` ville
   * fått ny identitet hver render, og da måtte effekten under enten utelate den
   * fra avhengighetene (og bli undertrykt) eller kjøre i loop. Her er
   * avhengighetslista ærlig.
   */
  settApent: (key: string | null) => void;
}) {
  const router = useRouter();
  const active = isItemActive(item, pathname);
  const children = childrenForRole(item, role as never);
  const count = item.badge === 'unread' ? unread : item.badge === 'helpdesk' ? helpdesk : 0;

  /**
   * ⚠️ Aktiv rad åpner seg selv — men bare når den BLIR aktiv, ikke ved hver
   * render. Uten `active` i avhengighetslista ville et klikk på en annen rad
   * blitt overstyrt tilbake med én gang, og accordionen aldri fått lukke noe.
   */
  useEffect(() => {
    if (active) settApent(item.key);
  }, [active, item.key, settApent]);

  const harBarn = children.length > 0;
  const teller = (
    <CountBadge count={count} label={item.badge === 'helpdesk' ? 'nye artikler' : 'uleste'} />
  );
  /* Pil-plassen er ALLTID 14px når den vises — så dropdown-radene holder
     chevronen helt til høyre. På rader UTEN barn (Innboks, Hjelp) sitter
     CountBadge i det sporet i stedet for å ligge 14px inn. Tom plassholder
     beholdes når telleren er 0, så «Ny» ikke hopper mot kanten. */
  const chevronPlass = (
    <span className="grid w-3.5 shrink-0 place-items-center" aria-hidden>
      {harBarn && (
        /* Snur med samme varighet som utfoldingen, så pilen og innholdet
           beveger seg som én ting. */
        <ChevronDown
          size={14}
          strokeWidth={1.75}
          className={`text-fg-muted transition-transform duration-200 ${apen ? 'rotate-180' : ''}`}
        />
      )}
    </span>
  );

  const innhold = (
    <>
      <Ikon icon={item.icon} active={active} />
      {!collapsed && (
        <>
          <span className="flex-1 truncate text-left">{item.label}</span>
          {item.isNew && <NewBadge />}
          {harBarn ? (
            <>
              {teller}
              {chevronPlass}
            </>
          ) : count > 0 ? (
            teller
          ) : (
            chevronPlass
          )}
        </>
      )}
    </>
  );

  const radKlasse = `flex h-control w-full items-center gap-2.5 rounded-control text-label text-fg transition-colors ${
    collapsed ? 'justify-center px-0' : 'px-2.5'
  } ${active ? 'bg-sidebar-active' : 'hover:bg-sidebar-active/60'}`;

  if (children.length === 0) {
    return (
      <Link
        href={item.href as Route}
        aria-current={active ? 'page' : undefined}
        title={collapsed ? item.label : undefined}
        className={radKlasse}
      >
        {innhold}
      </Link>
    );
  }

  // Kollapset: ingen plass til inline. Flyout er fallback, ikke mønsteret.
  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" title={item.label} className={radKlasse}>
            {innhold}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" sideOffset={16} className="z-50">
          <DropdownMenuHeader>{item.label}</DropdownMenuHeader>
          {children.map((c) => (
            <DropdownMenuItem key={c.href} onSelect={() => router.push(c.href as Route)}>
              {c.icon && (
                <c.icon size={IKON} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
              )}
              <span className="flex-1">{c.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-expanded={apen}
        onClick={() => settApent(apen ? null : item.key)}
        className={radKlasse}
      >
        {innhold}
      </button>

      {/**
       * ⛔ `grid-template-rows: 0fr → 1fr` og ikke `max-height`.
       *
       * En høydeanimasjon trenger et tall å gå MOT, og `height:auto` kan ikke
       * animeres. Den vanlige omgåelsen er `max-height: 500px`, men da må man
       * gjette en høyde: gjetter man for lavt, klippes den siste raden bort;
       * gjetter man for høyt, henger animasjonen i lufta før den starter fordi
       * den bruker like lang tid på piksler som ikke finnes.
       *
       * `0fr → 1fr` lar nettleseren regne ut den EKTE høyden, uansett hvor
       * mange underpunkter raden har. Barnet må ha `min-h-0` og
       * `overflow-hidden`, ellers nekter griden å krympe under innholdet.
       *
       * ⚠️ `aria-hidden` når lukket: innholdet er fortsatt i DOM-en (det er det
       * som gjør animasjonen mulig), og uten dette ville en skjermleser lest opp
       * underpunkter som ikke er synlige.
       */}
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          apen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
        aria-hidden={!apen}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="mt-0.5 flex flex-col gap-0.5 pb-1 pl-[26px]">
            {children.map((c) => {
              const childActive = isChildActive(c.href, pathname, search);
              return (
                <Link
                  key={c.href}
                  href={c.href as Route}
                  aria-current={childActive ? 'page' : undefined}
                  className={`flex h-8 items-center gap-2 rounded-control px-2 text-label transition-colors ${
                    childActive
                      ? 'bg-sidebar-active text-fg'
                      : 'text-fg-muted hover:bg-sidebar-active/60 hover:text-fg'
                  }`}
                >
                  {c.icon && <c.icon size={14} strokeWidth={1.75} className="shrink-0" />}
                  <span className="flex-1 truncate">{c.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
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
