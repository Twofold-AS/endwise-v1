'use client';

import Image from 'next/image';
import type { Route } from 'next';
import Link from 'next/link';

/**
 * Sidebar-topp uten visningsvelger. Ett skall per innlogging.
 * Inspect beholder «Tilbake til Endwise».
 */
export function SidebarHeader({
  collapsed,
  navn,
  inspect,
  inspectTilbakeHref,
}: {
  collapsed: boolean;
  navn: string;
  inspect?: boolean;
  inspectTilbakeHref?: string;
}) {
  if (inspect) {
    return (
      <Link
        href={(inspectTilbakeHref ?? '/endwise') as Route}
        className={`flex w-full items-center gap-2 rounded-control text-label text-fg hover:bg-sidebar-active/60 ${
          collapsed ? 'justify-center px-0' : 'px-1'
        }`}
      >
        <Image src="/logo/logo.svg" alt="" width={28} height={28} />
        {!collapsed && <span className="truncate">Tilbake til Endwise</span>}
      </Link>
    );
  }

  return (
    <div
      className={`flex w-full items-center gap-2 ${collapsed ? 'justify-center' : 'px-1'}`}
      title={navn}
    >
      <Image src="/logo/logo.svg" alt="Endwise" width={28} height={28} />
      {!collapsed && <span className="truncate text-label text-fg">{navn}</span>}
    </div>
  );
}
