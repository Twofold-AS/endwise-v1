'use client';

import { Sidebar } from '@/components/sidebar';
import { TopBar } from '@/components/top-bar';
import { useResolvedOrg } from '@/lib/use-resolved-org';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';

// Auth guard + brand-shell for everything inside the (app) route group.
//
// Shell per docs/ui-spec + 2026-05-12 spacing directive:
//   [TopBar h-12, full width, flush with page bg]
//   [Row: Sidebar card] [Content card] [(future) RightPanel card]
//     ↑                ↑                ↑
//     gap-2 between every adjacent card (8px); p-2 outer padding around
//     the whole row so the cards keep an 8px gutter against the page
//     edges even on tablet widths. pt-0 because the TopBar already
//     covers the top gutter.
//
// Each child card decides its own internal padding; the shell stays
// neutral. Inner flex containers ALSO use gap-2 (Talk-tabs ↔ Talk-card,
// Run-view main ↔ Right-panel).
export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status } = useResolvedOrg();

  useEffect(() => {
    if (status === 'no-session') {
      router.replace('/signin');
      return;
    }
    if (status === 'no-orgs') {
      router.replace('/create-organization');
    }
  }, [status, router]);

  if (status !== 'ready') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  // 2026-06-09: the topbar spans the FULL width at the very top so its left
  // brand cluster sits OVER the sidebar column (and the right-side controls over
  // the content). The sidebar + content live in the row beneath. The row gets
  // min-h-0 so tall pages scroll internally instead of squeezing the layout.
  // Shell stays transparent so the ColorBends/DotField backdrop shows through.
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <TopBar />
      <div className="relative flex min-h-0 flex-1">
        <Sidebar />
        {/* Content area: 8px gutter on the right + bottom. min-h-0 lets tall
         * pages (e.g. /chats) scroll internally. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col pr-2 pb-2">{children}</div>
      </div>
    </div>
  );
}
