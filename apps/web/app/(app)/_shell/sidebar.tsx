'use client';

import { CircleUser, type LucideIcon, Settings } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { authClient, useSession } from '@/lib/auth-client';
import { useOrgRole } from '../_lib/use-org-role';
import { NewBadge, SupportCard } from './cards';
import { itemsForRole, resolveActiveSectionKey, sectionsForRole } from './nav';

/**
 * Sidebar — NIVÅ 2: underpunktene (rollefiltrert) for aktiv seksjon. Bunn:
 * Support-kort + profilrad med innlogget bruker/rolle + logg ut.
 */
export function Sidebar() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { data: session } = useSession();
  const { role, isMechanic } = useOrgRole();

  const visible = sectionsForRole(role, isMechanic);
  const activeKey = resolveActiveSectionKey(pathname);
  const section = visible.find((s) => s.key === activeKey) ?? visible[0];
  const items = section ? itemsForRole(section, role) : [];
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  async function logout() {
    await authClient.signOut();
    router.push('/signin' as Route);
  }

  return (
    <aside className="flex w-[216px] shrink-0 flex-col border-r border-border bg-bg px-3 py-4">
      {section && (
        <>
          <p className="px-2.5 pb-1.5 font-medium text-fg-faint text-xs">{section.label}</p>
          <nav aria-label={`${section.label} — underpunkter`} className="flex flex-col gap-0.5">
            {items.map((item) => (
              <Row
                key={item.href}
                icon={item.icon}
                label={item.label}
                href={item.href}
                active={isActive(item.href)}
                isNew={item.isNew}
              />
            ))}
          </nav>
        </>
      )}

      <div className="mt-auto flex flex-col gap-3 pt-4">
        {!isMechanic && <SupportCard />}
        <div className="flex items-center gap-2">
          <CircleUser size={22} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-[13px] text-fg">
              {session?.user?.name ?? 'Ikke innlogget'}
            </span>
            <span className="truncate text-[11px] text-fg-faint">{role ?? '—'}</span>
          </div>
          <button
            type="button"
            onClick={logout}
            aria-label="Logg ut"
            title="Logg ut"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <Settings size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function Row({
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
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] leading-none transition-colors ${
        active ? 'bg-surface-2 text-fg' : 'text-fg hover:bg-surface-2'
      }`}
    >
      <span className="inline-flex text-fg-muted">
        <Icon size={13} strokeWidth={1.75} />
      </span>
      <span className="flex-1 truncate">{label}</span>
      {isNew && <NewBadge />}
    </Link>
  );
}
