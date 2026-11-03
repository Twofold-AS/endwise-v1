'use client';

import { Button, FeltAvkrysning, LasterFlate, toast } from '@endwise/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { OpprettSkuff } from '../_shell/opprett-skuff';

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
      toast.success('Gruppesamtalen er opprettet');
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
        className="inline-flex h-12 min-h-12 items-center rounded-pill px-4 text-body text-fg hover:bg-surface-2"
      >
        Inviter ansatt
      </button>
      <OpprettSkuff
        tittel="Inviter ansatt"
        apen={apen}
        onLukk={() => setApen(false)}
        tvingSkuff
        footer={
          <div className="flex w-full gap-2">
            <Button type="button" variant="ghost" onClick={() => setApen(false)}>
              Avbryt
            </Button>
            <Button
              type="button"
              disabled={valgte.size === 0 || fork.isPending}
              onClick={() => fork.mutate({ threadId, inviteeIds: [...valgte] })}
            >
              {fork.isPending ? 'Oppretter …' : 'Opprett gruppe'}
            </Button>
          </div>
        }
      >
        <p className="mb-3 text-body text-fg-muted">
          Starter en ny gruppesamtale. Den gamle tråden blir stående.
        </p>
        <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
          {team.isLoading ? (
            <li>
              <LasterFlate linjer={3} label="Henter ansatte" />
            </li>
          ) : ansatte.length === 0 ? (
            <li className="py-4 text-body text-fg-muted">Ingen andre ansatte å invitere.</li>
          ) : (
            ansatte.map((a) => (
              <li key={a.userId}>
                <FeltAvkrysning isSelected={valgte.has(a.userId)} onChange={() => toggle(a.userId)}>
                  {a.navn?.trim() || 'Ansatt'}
                </FeltAvkrysning>
              </li>
            ))
          )}
        </ul>
        {fork.isError ? <p className="mt-2 text-body text-danger">{fork.error.message}</p> : null}
      </OpprettSkuff>
    </>
  );
}
