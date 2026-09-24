'use client';

import { ClaudeTag } from '../_shell/claude-flate';
import { trpc } from '@/lib/trpc';

/**
 * Tråd-header: kunde + kjøretøy når inboxContext har det.
 */
export function TradHodeKjoretoy({ threadId }: { threadId: string }) {
  const ctx = trpc.inboxContext.forThread.useQuery({ threadId }, { enabled: Boolean(threadId) });
  if (ctx.data?.type !== 'kunde') return null;
  const k = ctx.data.kunde;
  const v = ctx.data.kjoretoy[0];
  const kjoretoy = v
    ? [v.make, v.model, v.regNumber].filter(Boolean).join(' · ')
    : null;
  return (
    <div data-trad-hode-kjoretoy className="flex flex-wrap items-center gap-2">
      <ClaudeTag tone="info">{k.navn}</ClaudeTag>
      {kjoretoy ? <ClaudeTag>{kjoretoy}</ClaudeTag> : null}
    </div>
  );
}
