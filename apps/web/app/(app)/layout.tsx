'use client';

import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { useOrgRole } from './_lib/use-org-role';
import { MobileShell } from './_shell/mobile-shell';
import { Sidebar } from './_shell/sidebar';
import { TopBar } from './_shell/top-bar';

/**
 * Admin/forhandler-shell (TheFold-stil) + auth-/rolle-guard.
 *
 * - Ikke innlogget → /signin.
 * - Mekaniker → låst til /min-dag (kosmetisk; RLS/adminProcedure er den ekte
 *   sperren server-side).
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const { data: session, isPending } = useSession();
  const { isMechanic, isLoading } = useOrgRole();

  useEffect(() => {
    if (!isPending && !session?.user) router.replace('/signin' as Route);
  }, [isPending, session, router]);

  useEffect(() => {
    if (!isLoading && isMechanic && !pathname.startsWith('/min-dag')) {
      router.replace('/min-dag' as Route);
    }
  }, [isLoading, isMechanic, pathname, router]);

  // F7-01 — Mekanikeren får mobil-shell (bottom-nav), ikke admin-sidebaren.
  // Server håndhever grensen (RLS + adminProcedure); dette er UI-formen.
  if (isMechanic) return <MobileShell>{children}</MobileShell>;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-bg text-fg">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
