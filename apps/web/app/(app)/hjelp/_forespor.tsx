'use client';

import { CircleAlert, StatefulButton } from '@endwise/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { trpc } from '@/lib/trpc';

/**
 * Forespørsler — samme Endwise-kanal som Innboks › Endwise.
 * Ikke et parallelt ticketsystem.
 */
export function HjelpForespor() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [emne, setEmne] = useState('');
  const [tekst, setTekst] = useState('');

  const post = trpc.messages.post.useMutation({
    onSuccess: (_, vars) => {
      void utils.messages.listThreads.invalidate();
      router.push(`/innboks/${vars.threadId}` as Route);
    },
  });

  const opprett = trpc.messages.createThread.useMutation({
    onSuccess: (traad) => {
      const id = (traad as { id?: string } | null)?.id;
      if (!id) return;
      post.mutate({
        threadId: id,
        body: tekst.trim() || 'Vi trenger hjelp.',
      });
    },
  });

  const jobber = opprett.isPending || post.isPending;
  const feil = opprett.error ?? post.error;

  function submit(e: FormEvent) {
    e.preventDefault();
    const tittel = emne.trim() || 'Forespørsel';
    opprett.mutate({
      kind: 'dealer_admin',
      subject: tittel,
      participantIds: [],
    });
  }

  return (
    <form data-hjelp-forespor onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-body text-fg-muted">
        Send en forespørsel til Endwise. Den lander i Innboks › Endwise — samme tråd som support.
      </p>
      <label className="flex flex-col gap-1.5">
        <span className="text-label text-fg">Emne</span>
        <input
          value={emne}
          onChange={(e) => setEmne(e.target.value)}
          maxLength={120}
          placeholder="Hva gjelder det?"
          className="ew-felt ew-felt-md px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-label text-fg">Melding</span>
        <textarea
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          rows={5}
          maxLength={2000}
          placeholder="Beskriv hva dere trenger."
          className="resize-y ew-felt ew-felt-md px-3 py-2"
        />
      </label>
      {feil && (
        <p className="flex items-start gap-2 text-body text-danger">
          <CircleAlert size={15} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          {feil.message}
        </p>
      )}
      <div className="flex justify-end">
        <StatefulButton
          type="submit"
          disabled={jobber}
          state={jobber ? 'loading' : feil ? 'error' : 'idle'}
          loadingText="Sender…"
          errorText="Feilet"
        >
          Send forespørsel
        </StatefulButton>
      </div>
    </form>
  );
}
