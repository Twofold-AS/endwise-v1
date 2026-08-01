'use client';

import { type LucideIcon, Search } from '@endwise/ui';
import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useOrgRole } from '../_lib/use-org-role';
import { NewBadge } from './cards';
import { resolveActiveSectionKey, sectionsForRole } from './nav';

/**
 * Topbar — NIVÅ 1: logo + SEKSJONENE brukerens rolle har lov til å se
 * (mekaniker ser kun «Min dag»). TheFold-stil (56px, borderBottom, #1a1a1a).
 */
export function TopBar() {
  const pathname = usePathname() ?? '';
  const { role, isMechanic } = useOrgRole();
  const activeKey = resolveActiveSectionKey(pathname);
  const sections = sectionsForRole(role, isMechanic);

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-bg px-5">
      <Link
        href="/dashboard"
        aria-label="Endwise — til oversikten"
        className="flex shrink-0 items-center"
      >
        <Image
          src="/logo/logo.svg"
          alt="Endwise"
          width={32}
          height={32}
          priority
          style={{ height: 'auto' }}
        />
      </Link>

      <nav
        aria-label="Seksjoner"
        className="no-scrollbar flex min-w-0 items-center gap-1 overflow-x-auto"
      >
        {sections.map((s) => (
          <TopLink
            key={s.key}
            icon={s.icon}
            label={s.label}
            href={s.items[0].href}
            active={s.key === activeKey}
            isNew={s.isNew}
          />
        ))}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label="Søk"
          title="Søk (⌘K)"
          className="flex size-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <Search size={16} strokeWidth={1.75} />
        </button>
      </div>
    </header>
  );
}

function TopLink({
  icon: Icon,
  label,
  href,
  active,
  isNew,
}: {
  icon: LucideIcon;
  label: string;
  href: string;
  active: boolean;
  isNew?: boolean;
}) {
  return (
    <Link
      href={href as Route}
      aria-current={active ? 'page' : undefined}
      className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] leading-none transition-colors ${
        active ? 'bg-surface-2 text-fg' : 'text-fg hover:bg-surface-2'
      }`}
    >
      <span className="inline-flex text-fg-muted">
        <Icon size={13} strokeWidth={1.75} />
      </span>
      {label}
      {isNew && <NewBadge />}
    </Link>
  );
}
