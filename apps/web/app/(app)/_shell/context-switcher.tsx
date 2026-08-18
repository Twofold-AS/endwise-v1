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

/**
 * F5-13 / F5-28 — Merkeboks + kontekst-dropdown i sidebarens header.
 *
 * Logoen ligger i en egen liten svart boks — i BEGGE temaer. Den er en
 * merkemarkør, ikke en flate som skal snu med resten av UI-et.
 *
 * ── Hva dropdownen faktisk gjør, og hva den IKKE gjør ─────────────────────
 * Øverste seksjon bytter **visning** innenfor samme tenant. Ingen tilgang
 * endres; det er de samme rettighetene, andre nav-rader.
 *
 * Nederste seksjon (kun i dev-mode) bytter **tenant**, og det er en helt annen
 * sak. Den går gjennom Better-Auths `organization.setActive`, som validerer
 * medlemskapet på nytt server-side — vi sender aldri en tenant-id vi har funnet
 * på. Lista kommer fra `tenants.myDemoTenants`, som kun returnerer demo-tenants
 * du ALLEREDE er medlem av.
 *
 * ⛔ **Ingen auto-innmelding.** Å bytte til en tenant man ikke er medlem av er
 * ikke en funksjon som mangler — det er funksjonen vi med vilje ikke bygger.
 *
 * ⚠️ Alt her er kosmetikk. RLS + `assertMember` + `endwiseAdminProcedure` er
 * de ekte sperrene; dette skjuler bare valg man uansett ville fått 403 på.
 */
export function ContextSwitcher({
  contexts,
  active,
  dealerName,
  userName,
  roleLabel,
  collapsed,
  canSwitchDemo = false,
  onSelect,
}: {
  contexts: Valg[];
  active: ContextKey;
  collapsed: boolean;
  dealerName: string;
  userName: string;
  roleLabel: string;
  canSwitchDemo?: boolean;
  onSelect: (key: ContextKey) => void;
}) {
  const router = useRouter();
  const current = CONTEXTS.find((c) => c.key === active) ?? CONTEXTS[0];
  const canSwitch = contexts.length > 1;

  /**
   * ⚠️ Gated på `canSwitchDemo` (flagg + endwise_admin), IKKE på full dev-mode.
   * Full dev-mode krever `tenants.kind = 'demo'` — og da ville bytteren som
   * får deg INN i en demo-tenant vært gjemt bak seg selv. Høna og egget.
   *
   * Det svekker ingenting: ruta er `endwiseAdminProcedure` og returnerer kun
   * tenants du allerede er medlem av. `enabled` sparer et kall, den beskytter
   * ingenting.
   */
  const demoTenants = trpc.tenants.myDemoTenants.useQuery(undefined, { enabled: canSwitchDemo });

  async function byttTenant(tenantId: string) {
    // Better-Auth validerer medlemskapet. Vi ber om et bytte; vi utfører det ikke.
    await authClient.organization.setActive({ organizationId: tenantId });
    // Hard reload: tRPC-cachen er full av forrige tenants data, og en
    // invalidering som glemmer én query ville vist to tenants samtidig.
    window.location.assign('/dashboard');
  }

  const navn = (
    <span className="flex min-w-0 flex-1 flex-col text-left">
      <span className="truncate text-label text-fg">{dealerName}</span>
      <span className="truncate text-[12px] text-fg-muted">
        {userName} · {roleLabel}
      </span>
    </span>
  );

  /** Merkeboks: liten, svart, hvit logo. Samme i lyst og mørkt. */
  const logo = (
    <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-black">
      <Image
        src="/logo/logo.svg"
        alt="Endwise"
        width={18}
        height={18}
        priority
        className="logo-on-dark"
        style={{ height: 'auto' }}
      />
    </span>
  );

  /**
   * Én kontekst = ingen dropdown. En pil som ikke leder noe sted er verre enn
   * ingen pil.
   */
  if (!canSwitch) {
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
        {/*
          ⚠️ **Kollapset sidebar hadde INGEN velger** (rettet 09.08.2026).
          Koden gjorde `collapsed ? null : ...`, så logoboksen ble stående igjen
          som ren dekorasjon — og både visningsbytte og demo-tenant-bytte var
          utilgjengelig helt til du utvidet sidebaren igjen. En kontroll som
          forsvinner er verre enn en som er trang: du vet ikke at den fantes.

          Nå er logoboksen SELV triggeren når sidebaren er smal. Menyen under er
          den samme; det er bare knappen som endrer form.
        */}
        <DropdownMenuTrigger asChild>
          {collapsed ? (
            <button
              type="button"
              title={`Bytt visning — nå: ${current.label}`}
              aria-label={`Bytt visning — nå: ${current.label}`}
              className="rounded-[10px] transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-ring"
            >
              {logo}
            </button>
          ) : (
            <button
              type="button"
              aria-label={`Bytt visning — nå: ${current.label}`}
              className="flex min-w-0 flex-1 items-center gap-1 rounded-control px-1.5 py-1 text-left transition-colors hover:bg-sidebar-active focus-visible:outline-2 focus-visible:outline-ring"
            >
              {navn}
              {/* 14px = 2px mindre enn nav-ikonene, og peker alltid ned. */}
              <ChevronDown size={14} className="shrink-0 text-fg-muted" />
            </button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={6} className="min-w-[248px]">
          <DropdownMenuHeader>Visning</DropdownMenuHeader>
          {contexts.map((c) => (
            <DropdownMenuItem
              key={c.key}
              disabled={c.disabled}
              onSelect={() => {
                if (c.disabled) return;
                onSelect(c.key);
                router.push(c.landing as Route);
              }}
              className={`h-row-store ${c.key === active ? 'bg-sidebar-active' : ''}`}
            >
              <c.icon size={16} className="shrink-0 text-fg-muted" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-label text-fg">{c.label}</span>
                {/* F5-29: låste valg forklarer seg selv. Å la mekaniker-
                      visningen bare FORSVINNE var grunnen til at den ikke lot
                      seg finne — den var der hele tiden, uten dør. */}
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

          {/* ── Dev-mode: bytt DEMO-TENANT (ikke bare visning) ────────── */}
          {canSwitchDemo && (demoTenants.data?.length ?? 0) > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuHeader>Demo-tenants (dev-mode)</DropdownMenuHeader>
              {demoTenants.data?.map((t) => (
                <DropdownMenuItem key={t.id} onSelect={() => void byttTenant(t.id)}>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-label text-fg">{t.name}</span>
                    <span className="truncate text-[12px] text-fg-muted">{t.slug}</span>
                  </span>
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
