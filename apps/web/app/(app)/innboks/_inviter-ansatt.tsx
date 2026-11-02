'use client';

import { Button, FeltAvkrysning, Modal, ModalBody, ModalFooter, ModalHeader } from '@endwise/ui';
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
      <Modal
        isOpen={apen}
        onOpenChange={(o) => {
          if (!o) setApen(false);
        }}
        size="sm"
      >
        {({ close }) => (
          <>
            <ModalHeader
              title="Inviter ansatt"
              description="Starter en ny gruppesamtale. Den gamle tråden blir stående."
            />
            <ModalBody>
              <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                {team.isLoading ? (
                  <li className="py-4 text-label text-fg-muted">Laster ansatte …</li>
                ) : ansatte.length === 0 ? (
                  <li className="py-4 text-label text-fg-muted">Ingen andre ansatte å invitere.</li>
                ) : (
                  ansatte.map((a) => (
                    <li key={a.userId}>
                      <FeltAvkrysning
                        isSelected={valgte.has(a.userId)}
                        onChange={() => toggle(a.userId)}
                      >
                        {a.navn?.trim() || 'Ansatt'}
                      </FeltAvkrysning>
                    </li>
                  ))
                )}
              </ul>
              {fork.isError ? (
                <p className="mt-2 text-[12px] text-danger">{fork.error.message}</p>
              ) : null}
            </ModalBody>
            <ModalFooter>
              <Button type="button" variant="ghost" onClick={close}>
                Avbryt
              </Button>
              <Button
                type="button"
                disabled={valgte.size === 0 || fork.isPending}
                onClick={() => fork.mutate({ threadId, inviteeIds: [...valgte] })}
              >
                {fork.isPending ? 'Oppretter …' : 'Opprett gruppe'}
              </Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </>
  );
}
