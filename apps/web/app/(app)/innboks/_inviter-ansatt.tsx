'use client';

import { Dialog, DialogContent, DialogTitle } from '@endwise/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';

/**
 * Mikael 02.09: Inviter ansatt FORKER en ny gruppesamtale.
 * Gammel tråd står. Ingen e-post, ingen dest/From.
 */
export function InviterAnsatt({ threadId }: { threadId: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [apen, setApen] = useState(false);
  const [valgte, setValgte] = useState<ReadonlySet<string>>(() => new Set());
  const me = trpc.session.me.useQuery();
  const team = trpc.team.list.useQuery(undefined, { enabled: apen });
  const fork = trpc.messages.forkThread.useMutation({
    onSuccess: (ny) => {
      void utils.messages.listThreads.invalidate();
      void utils.messages.listMessages.invalidate({ threadId });
      setApen(false);
      setValgte(new Set());
      router.push(`/innboks/${ny.id}` as Route);
    },
  });

  const ansatte = useMemo(
    () => (team.data ?? []).filter((a) => a.userId && a.userId !== me.data?.userId),
    [team.data, me.data?.userId],
  );

  function toggle(id: string) {
    setValgte((forrige) => {
      const neste = new Set(forrige);
      if (neste.has(id)) neste.delete(id);
      else neste.add(id);
      return neste;
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setApen(true)}
        className="inline-flex min-h-11 items-center rounded-control px-2.5 text-label text-fg hover:bg-surface-2 md:h-control md:min-h-control"
      >
        Inviter ansatt
      </button>
      <Dialog open={apen} onOpenChange={(o) => !o && setApen(false)}>
        <DialogContent className="top-1/2 left-1/2 w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 p-5">
          <DialogTitle className="text-title text-fg">Inviter ansatt</DialogTitle>
          <p className="mt-1 text-[12px] text-fg-muted">
            Starter en ny gruppesamtale. Den gamle tråden blir stående.
          </p>
          <ul className="mt-3 flex max-h-64 flex-col gap-1 overflow-y-auto">
            {team.isLoading ? (
              <li className="py-4 text-label text-fg-muted">Laster ansatte …</li>
            ) : ansatte.length === 0 ? (
              <li className="py-4 text-label text-fg-muted">Ingen andre ansatte å invitere.</li>
            ) : (
              ansatte.map((a) => (
                <li key={a.userId}>
                  <button
                    type="button"
                    aria-pressed={valgte.has(a.userId)}
                    onClick={() => toggle(a.userId)}
                    className={`flex w-full min-h-11 items-center gap-2 rounded-control px-2 text-left text-label ${
                      valgte.has(a.userId) ? 'bg-sidebar-active text-fg' : 'text-fg hover:bg-surface-2'
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`size-4 shrink-0 rounded-sm border ${
                        valgte.has(a.userId) ? 'border-fg bg-fg' : 'border-border bg-bg'
                      }`}
                    />
                    {a.navn?.trim() || 'Ansatt'}
                  </button>
                </li>
              ))
            )}
          </ul>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setApen(false)}
              className="h-control px-3 text-label text-fg-muted"
            >
              Avbryt
            </button>
            <button
              type="button"
              disabled={valgte.size === 0 || fork.isPending}
              onClick={() => fork.mutate({ threadId, inviteeIds: [...valgte] })}
              className="h-control rounded-control bg-fg px-3 text-label text-bg disabled:opacity-40"
            >
              {fork.isPending ? 'Oppretter …' : 'Opprett gruppe'}
            </button>
          </div>
          {fork.isError ? (
            <p className="mt-2 text-[12px] text-danger">{fork.error.message}</p>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
