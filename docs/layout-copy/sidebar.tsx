'use client';

// Sidebar — Bundle B restructure (recessed/raised sprint, 2026-06-07).
//
// The rail is a LIGHT glass surface, full-height, floating over the dark
// backdrop (→ white content). Nav text + hovers are white-on-glass.
//
//   ┌───────────────────────┐
//   │ New chat              │
//   │ Chats · Projects ·  │   (no brand header — logo lives in the topbar)
//   │ Org · Agents · …      │
//   │      (flex spacer)    │
//   │ ▭ Collapse  ← BOTTOM  │
//   └───────────────────────┘
//
// The data-driven "My Agents" list (Batch 3B) was removed in the 2026-07-04
// master-collapse cleanup — the sidebar now carries a single "Agents" link to
// the full /agents page instead of an inline agent roster.
//
// Two states, persisted in localStorage: icon-only (default, 60px) + expanded
// (240px). Collapsed shows icons + tooltips only.
//
// Shimmer: the Chats row shimmers when ANY run is active. (The separate Loops +
// Automations rows were removed in the 2026-07-04 master-collapse — loops are an
// internal orchestration structure, and a trigger is now a field on an agent.)

import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { setSidebarCollapsed, useSidebarCollapsed } from '@/lib/use-sidebar-collapsed';
import {
  Bot,
  FolderKanban,
  type LucideIcon,
  MessageSquarePlus,
  MessagesSquare,
  PanelLeft,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

const ACTIVE_STATUSES = new Set(['planning', 'awaiting_answer', 'review', 'executing']);

const WIDTH_COLLAPSED = 60;
const WIDTH_EXPANDED = 240;

export function Sidebar() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { data: session } = useSession();
  const orgId = session?.session.activeOrganizationId;

  // ── collapse state (shared with the topbar via use-sidebar-collapsed) ──
  const collapsed = useSidebarCollapsed();
  const toggleCollapsed = useCallback(() => setSidebarCollapsed(!collapsed), [collapsed]);

  // ── live-run signal for shimmer ─────────────────────────────────────
  const runs = trpc.masterRuns.list.useQuery(
    { limit: 50 },
    {
      refetchInterval: 5_000,
      enabled: Boolean(orgId),
    },
  );
  const anyActive = useMemo(
    () => (runs.data ?? []).some((r) => ACTIVE_STATUSES.has(r.status)),
    [runs.data],
  );

  // ── New chat / Chats → Home (`/dashboard`). New chat always lands on a
  //    fresh Home (no stale ?conversation=). ──────────────────────────
  const onNewChat = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  // Bug-3: "Chats" opens the dedicated chat-history list (/chats), NOT the
  // /tasks kanban and NOT a fresh composer. "New chat" is the fresh-Home action.
  const onChats = useCallback(() => {
    router.push('/chats');
  }, [router]);

  return (
    // The sidebar occupies a FIXED 60px slot in the shell row so expanding/
    // collapsing never reflows the content. The actual rail is an absolutely-
    // positioned overlay panel inside that slot, FULL HEIGHT (top-0 bottom-0) —
    // its width animates 60↔240 and floats over the content's left edge when
    // expanded. Bundle B: light cream surface, top-rounded only.
    <aside className="relative z-40 h-full flex-shrink-0" style={{ width: WIDTH_COLLAPSED }}>
      <div
        className="glass-surface no-scrollbar absolute top-3 bottom-3 left-3 flex flex-col overflow-x-hidden overflow-y-auto rounded-2xl pb-2"
        style={{
          // Floating glass card — 12px margin top/left/bottom (the -12 keeps the
          // collapsed rail's right edge flush at the 60px slot), rounded on all
          // four corners. Glass over the dark backdrop → white content.
          width: (collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED) - 12,
          transition: 'width 180ms ease',
        }}
      >
        {/* No brand header — the logo + "TheFold" live in the topbar now
         *  (2026-06-09). The rail starts straight into the nav wrappers. */}
        <div className="flex flex-col px-1.5 pt-3">
          <NavGroup>
            <NavRow
              icon={MessageSquarePlus}
              label="New chat"
              collapsed={collapsed}
              iconCircle
              onClick={onNewChat}
            />
            {/* Extra breathing room between "New chat" and the rest. */}
            <div className="h-2" />
            <NavRow
              icon={MessagesSquare}
              label="Chats"
              collapsed={collapsed}
              active={pathname.startsWith('/chats')}
              shimmer={anyActive}
              onClick={onChats}
            />
            <NavRow
              icon={FolderKanban}
              label="Projects"
              collapsed={collapsed}
              active={pathname.startsWith('/projects')}
              onClick={() => router.push('/projects')}
            />
            <NavRow
              icon={Users}
              label="Org"
              collapsed={collapsed}
              active={pathname.startsWith('/org')}
              onClick={() => router.push('/org')}
            />
            <NavRow
              icon={Bot}
              label="Agents"
              collapsed={collapsed}
              active={pathname.startsWith('/agents')}
              onClick={() => router.push('/agents')}
            />
            <NavRow icon={SlidersHorizontal} label="Customize" collapsed={collapsed} disabled />
          </NavGroup>
        </div>

        {/* Spacer pushes the collapse toggle to the very bottom. */}
        <div className="min-h-6 flex-1" />

        <CollapseButton collapsed={collapsed} onToggle={toggleCollapsed} />
      </div>
    </aside>
  );
}

// ── Collapse toggle button (bottom) ───────────────────────────────────
// Bundle B: the PanelLeft "sidebar" glyph, pinned to the rail bottom. Expanded
// shows an icon + "Collapse" label row; collapsed shows just the centered icon.
function CollapseButton({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <div className="px-1.5">
      <button
        type="button"
        onClick={onToggle}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={`flex h-9 items-center rounded-md transition-colors ${
          collapsed ? 'w-full justify-center px-0' : 'w-full gap-2.5 px-2.5'
        }`}
        style={{ color: 'rgba(255,255,255,0.6)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
          e.currentTarget.style.color = 'rgba(255,255,255,0.95)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
        }}
      >
        <PanelLeft size={18} strokeWidth={2} className="flex-shrink-0" />
        {!collapsed && <span className="text-[12.5px] font-medium">Collapse</span>}
      </button>
    </div>
  );
}

// ── Nav group ─────────────────────────────────────────────────────────
// A borderless section inside the single sidebar container — no glass card, no
// divider lines, NO text header. Groups are separated only by whitespace.
//
// 2026-06-07: the per-group text label ("Navigation"/"Agents"/"Automations")
// was removed. It only rendered when expanded, so it appeared/disappeared on
// collapse and shoved the icons vertically (Bug 1) — and the user wanted the
// headers gone anyway (Bug 2). Removing it does both.
function NavGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex w-full flex-col gap-0.5 py-1.5">{children}</div>;
}

// ── Nav row ───────────────────────────────────────────────────────────
function NavRow({
  icon: Icon,
  label,
  collapsed,
  active = false,
  disabled = false,
  shimmer = false,
  iconCircle = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  collapsed: boolean;
  active?: boolean;
  disabled?: boolean;
  shimmer?: boolean;
  /** Wrap the icon in a recessed circle (used by "New chat"). */
  iconCircle?: boolean;
  onClick?: () => void;
}) {
  // Glass sidebar → white text.
  const idleColor = disabled ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.8)';
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      title={collapsed || disabled ? (disabled ? `${label} — coming soon` : label) : undefined}
      aria-label={label}
      className={`flex h-9 items-center rounded-md transition-colors ${
        collapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5'
      }`}
      style={{
        color: active ? 'rgba(255,255,255,0.98)' : idleColor,
        background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !active) e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
      }}
      onMouseLeave={(e) => {
        if (!disabled && !active) e.currentTarget.style.background = 'transparent';
      }}
    >
      {/* Every nav icon sits in the SAME 28px circular hit-area so they all
       *  center identically (Bundle A). Only "New chat" (iconCircle) gets the
       *  visible .recessed styling; the rest are transparent same-size wrappers. */}
      <span
        className={`inline-flex h-7 w-7 flex-shrink-0 items-center justify-center ${
          iconCircle ? 'recessed' : ''
        }`}
        style={{
          borderRadius: '50%',
          ...(iconCircle ? { color: 'var(--ink-strong)' } : {}),
        }}
      >
        <Icon size={17} strokeWidth={2} />
      </span>
      {!collapsed && (
        <span
          className={`truncate text-[12.5px] ${shimmer ? 'shimmer-text' : ''}`}
          style={{ fontFamily: 'var(--font-google-sans)', fontWeight: 500 }}
        >
          {label}
        </span>
      )}
    </button>
  );
}
