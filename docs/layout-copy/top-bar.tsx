'use client';

// App-shell topbar — 2026-06-09 restructure.
//
// Transparent strip (no bg/border/glass) over the page. justify-between:
//   LEFT:  [logo.svg] [TheFold] — brand, mirrors the signin styling exactly
//          (Google Sans, text-2xl, font-semibold, tracking-tight, white).
//   RIGHT: SSE pill · Search (⌘K) · Bell · Profile (floating light/glass buttons).
// The sidebar no longer carries a brand header.

import { CommandPalette } from '@/components/command-palette';
import { HeaderRunIndicator } from '@/components/header-run-indicator';
import { NotificationsPopover } from '@/components/notifications-popover';
import { ProfileMenu } from '@/components/profile-menu';
import { SseStatusIndicator } from '@/components/sse-status-indicator';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SlotText } from 'slot-text/react';

// Entrance roll for the wordmark — a calm, classy roll (less playful bounce than
// the default) since it only plays once on app-shell load.
const WORDMARK_SLOT_OPTIONS = { direction: 'up', stagger: 55, duration: 360, bounce: 0.4 } as const;

export function TopBar() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Roll "TheFold" in from blank on first mount, then it sits static. slot-text
  // builds its mount text statically (no roll) and animating FROM an empty
  // container short-circuits to a static build — so we mount with a single space
  // (a real, non-empty cell), then flip to the wordmark after mount: the
  // ' ' -> 'TheFold' transition rolls each letter in. The (app) layout persists
  // across client navigations, so TopBar mounts once per page-load — the roll
  // does NOT replay on every route change.
  const [wordmark, setWordmark] = useState(' ');
  useEffect(() => {
    setWordmark('TheFold');
  }, []);

  // ⌘K / Ctrl+K toggles the command palette. Esc inside the palette
  // closes it via the Dialog's own keyboard handling.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    // Full-width transparent strip. Brand on the LEFT (always logo + "TheFold"),
    // over the sidebar column; controls fill the rest on the RIGHT, over content.
    // pl-[22px] centres the 40px logo over the sidebar nav-icon centre (nav-icon
    // box at x≈28, centre ≈42 → logo (40px) left = 42-20 = 22). shrink-0 locks h.
    <header className="relative z-30 flex h-14 w-full shrink-0 items-center">
      {/* LEFT: logo + wordmark, aligned over the sidebar nav. */}
      <Link
        href="/dashboard"
        className="flex h-full flex-shrink-0 items-center gap-2.5 pl-[22px] pr-3"
        title="Go to Home"
      >
        <Image
          src="/logo/logo.svg"
          alt=""
          width={40}
          height={40}
          className="flex-shrink-0"
          style={{ filter: 'brightness(0) invert(1)' }}
        />
        <SlotText
          text={wordmark}
          options={WORDMARK_SLOT_OPTIONS}
          aria-label="TheFold"
          className="text-xl font-semibold tracking-tight"
          style={{ color: 'var(--brand-text)' }}
        />
      </Link>

      {/* RIGHT: floating light/glass-button controls, over the content. */}
      <div className="flex flex-1 items-center justify-end gap-2 px-3">
        <HeaderRunIndicator />
        <SseStatusIndicator />

        {/* Search → command palette (⌘K). */}
        <Button
          variant="glass"
          size="icon-md"
          onClick={() => setPaletteOpen(true)}
          title="Search or jump to… (⌘K)"
          aria-label="Search"
        >
          <Search size={17} />
        </Button>

        <ThemeToggle />

        <NotificationsPopover />

        <ProfileMenu side="bottom" align="end" />
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  );
}
