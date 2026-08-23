'use client';

import {
  Check,
  ChevronDown,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuHeader,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Lock,
} from '@endwise/ui';
import type { Route } from 'next';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { type AppContext, CONTEXTS, type ContextKey } from './nav';

type Valg = AppContext & { disabled?: boolean; disabledHint?: string };

export type VerkstedMedlemskap = {
  id: string;
  name: string;
  slug: string;
  role: string;
  isMechanic?: boolean;
};

/**
 * F5-13 / F5-28 — Merkeboks + kontekst-dropdown.
 *
 * Når aktiv org er plattform-tenanten: header Endwise + Plattform.
 * Dropdown viser bare Endwise. «Forhandlere» er inspect-URL
 * (`/endwise/verksted/[slug]`), aldri setActive. Ekte verksted-medlemskap
 * kommer ETTER «Dine verksteder» — det er ekte medlemskap, ikke Se verkstedet.
 *
 * I Se verkstedet (inspect): bare «Tilbake til Endwise». Ingen setActive.
 */
export function ContextSwitcher({
  contexts,
  active,
  dealerName,
  collapsed,
  canSwitchDemo = false,
  erPlattform = false,
  inspect = false,
  inspectTilbakeHref = '/endwise',
  verksteder = [],
  plattformTenantId = null,
  onSelect,
}: {
  contexts: Valg[];
  active: ContextKey;
  collapsed: boolean;
  dealerName: string;
  canSwitchDemo?: boolean;
  erPlattform?: boolean;
  inspect?: boolean;
  inspectTilbakeHref?: string;
  verksteder?: VerkstedMedlemskap[];
  plattformTenantId?: string | null;
  onSelect: (key: ContextKey) => void;
}) {
  const router = useRouter();
  const current = CONTEXTS.find((c) => c.key === active) ?? CONTEXTS[0];
  const demoTenants = trpc.tenants.myDemoTenants.useQuery(undefined, {
    enabled: canSwitchDemo && !inspect,
  });
  const alleForhandlere = trpc.tenants.list.useQuery(undefined, {
    enabled: erPlattform && !inspect,
    retry: false,
  });

  async function byttTenant(tenantId: string, landing: string) {
    await authClient.organization.setActive({ organizationId: tenantId });
    window.location.assign(landing);
  }

  const headerNavn = inspect ? dealerName : erPlattform ? 'Endwise' : dealerName;
  const headerUnder = inspect ? 'Kun lesing' : erPlattform ? 'Plattform' : current.label;

  const navn = (
    <span className="flex min-w-0 flex-1 flex-col text-left">
      <span className="truncate text-label text-fg">{headerNavn}</span>
      <span className="truncate text-[12px] text-fg-muted">{headerUnder}</span>
    </span>
  );

  const logoHoyde = collapsed ? 13 : 18;
  const logo = (
    <Image
      src="/logo/logo.svg"
      alt="Endwise"
      width={Math.round((logoHoyde * 222) / 134)}
      height={logoHoyde}
      priority
      className="logo-invert shrink-0"
    />
  );

  const visningsvalg = erPlattform
    ? contexts.filter((c) => c.key === 'endwise')
    : contexts.filter((c) => !(erPlattform && c.key !== 'endwise'));

  const kanSwitch =
    inspect ||
    visningsvalg.length > 1 ||
    verksteder.length > 0 ||
    (erPlattform && (alleForhandlere.data?.length ?? 0) > 0) ||
    Boolean(plattformTenantId && !erPlattform);

  if (!kanSwitch) {
    return (
      <div className={`flex items-center gap-2 ${collapsed ? '' : 'min-w-0 flex-1'}`}>
        {logo}
        {!collapsed && <span className="min-w-0 flex-1 px-1.5 py-1">{navn}</span>}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${collapsed ? '' : 'min-w-0 flex-1'}`}>
      {!collapsed && logo}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {collapsed ? (
            <button
              type="button"
              title={
                inspect
                  ? 'Tilbake til Endwise'
                  : erPlattform
                    ? 'Bytt visning — Plattform'
                    : `Bytt visning — nå: ${current.label}`
              }
              aria-label={
                inspect
                  ? 'Tilbake til Endwise'
                  : erPlattform
                    ? 'Bytt visning — Plattform'
                    : `Bytt visning — nå: ${current.label}`
              }
              className="rounded-control p-1 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-ring"
            >
              {logo}
            </button>
          ) : (
            <button
              type="button"
              aria-label={
                inspect
                  ? 'Tilbake til Endwise'
                  : erPlattform
                    ? 'Bytt visning — Plattform'
                    : `Bytt visning — nå: ${current.label}`
              }
              className="flex min-w-0 flex-1 items-center gap-1 rounded-control px-1.5 py-1 text-left transition-colors hover:bg-sidebar-active focus-visible:outline-2 focus-visible:outline-ring"
            >
              {navn}
              <ChevronDown size={14} className="shrink-0 text-fg-muted" />
            </button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={6} className="min-w-[248px]">
          {inspect ? (
            <>
              <DropdownMenuHeader>Visning</DropdownMenuHeader>
              <DropdownMenuItem
                onSelect={() => {
                  router.push(inspectTilbakeHref as Route);
                }}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-label text-fg">Tilbake til Endwise</span>
                  <span className="truncate text-[12px] text-fg-muted">Forlater lesing</span>
                </span>
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuHeader>Visning</DropdownMenuHeader>
              {visningsvalg.map((c) => (
                <DropdownMenuItem
                  key={c.key}
                  disabled={c.disabled}
                  onSelect={() => {
                    if (c.disabled) return;
                    if (c.key === 'endwise' && plattformTenantId && !erPlattform) {
                      void byttTenant(plattformTenantId, '/endwise');
                      return;
                    }
                    onSelect(c.key);
                    router.push(c.landing as Route);
                  }}
                  className={`h-row-store ${c.key === active ? 'bg-sidebar-active' : ''}`}
                >
                  <c.icon size={16} className="shrink-0 text-fg-muted" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-label text-fg">{c.label}</span>
                    <span className="truncate text-[12px] text-fg-muted">
                      {c.disabled ? c.disabledHint : c.hint}
                    </span>
                  </span>
                  {c.disabled ? (
                    <Lock size={14} className="shrink-0 text-fg-muted" aria-hidden />
                  ) : (
                    c.key === active && <Check size={16} className="shrink-0 text-accent-strong" />
                  )}
                </DropdownMenuItem>
              ))}

              {erPlattform && (alleForhandlere.data?.length ?? 0) > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuHeader>Forhandlere</DropdownMenuHeader>
                  {alleForhandlere.data?.map((t) => (
                    <DropdownMenuItem
                      key={t.id}
                      onSelect={() => {
                        router.push(
                          `/endwise/verksted/${t.slug}/dashboard?fra=forhandlere` as Route,
                        );
                      }}
                    >
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-label text-fg">{t.name}</span>
                        <span className="truncate text-[12px] text-fg-muted">
                          Kun lesing · {t.slug}
                        </span>
                      </span>
                    </DropdownMenuItem>
                  ))}
                </>
              )}

              {erPlattform && verksteder.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuHeader>Dine verksteder</DropdownMenuHeader>
                  {verksteder.flatMap((v) => {
                    const rader = [
                      { key: `${v.id}-forhandler`, label: 'Forhandler', landing: '/dashboard' },
                      { key: `${v.id}-lager`, label: 'Lager', landing: '/lager' },
                    ];
                    if (v.isMechanic) {
                      rader.splice(1, 0, {
                        key: `${v.id}-mekaniker`,
                        label: 'Mekaniker',
                        landing: '/min-dag',
                      });
                    }
                    return rader.map((r) => (
                      <DropdownMenuItem
                        key={r.key}
                        onSelect={() => {
                          void byttTenant(v.id, r.landing);
                        }}
                      >
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-label text-fg">{r.label}</span>
                          <span className="truncate text-[12px] text-fg-muted">{v.name}</span>
                        </span>
                      </DropdownMenuItem>
                    ));
                  })}
                </>
              )}

              {canSwitchDemo && (demoTenants.data?.length ?? 0) > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuHeader>Demo-tenants (dev-mode)</DropdownMenuHeader>
                  {demoTenants.data?.map((t) => (
                    <DropdownMenuItem
                      key={t.id}
                      onSelect={() => void byttTenant(t.id, '/dashboard')}
                    >
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-label text-fg">{t.name}</span>
                        <span className="truncate text-[12px] text-fg-muted">{t.slug}</span>
                      </span>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
