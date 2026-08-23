'use client';

import { CircleAlert, LifeBuoy, type LucideIcon, StatefulButton, Users, Wrench } from '@endwise/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../_shell/cards';
import type { ThreadKind } from './_lib';

/**
 * F6-01 / F5-14 — «NY SAMTALE».
 *
 * Primærstien er ÉN knapp: «Skriv til Endwise». Ingen part-velger, ingen
 * kanal, ingen bruker-ID. En 50-åring på verkstedet skal ikke kunne sende
 * til feil sted. Emnet skrives i tråden etter at den er åpnet.
 *
 * «Annen samtale» folder ut Intern/Kunde — bevisst gjemt.
 */
const ANDRE_PARTER: { key: Exclude<ThreadKind, 'dealer_admin'>; label: string; icon: LucideIcon }[] =
  [
    { key: 'mechanic_dealer', label: 'Intern', icon: Wrench },
    { key: 'customer_dealer', label: 'Kunde', icon: Users },
  ];

export function NySamtale({ onLukk }: { onLukk: () => void }) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [annen, setAnnen] = useState(false);
  const [annenKind, setAnnenKind] = useState<Exclude<ThreadKind, 'dealer_admin'>>('mechanic_dealer');

  const opprett = trpc.messages.createThread.useMutation({
    onSuccess: (tråd) => {
      void utils.messages.listThreads.invalidate();
      const id = (tråd as { id?: string } | null)?.id;
      if (id) router.replace(`/innboks/${id}` as Route);
      else onLukk();
    },
  });

  function skrivTilEndwise() {
    opprett.mutate({
      kind: 'dealer_admin',
      channel: 'app',
      subject: 'Hjelp',
      participantIds: [],
    });
  }

  function startAnnen(e: FormEvent) {
    e.preventDefault();
    opprett.mutate({
      kind: annenKind,
      channel: 'app',
      participantIds: [],
    });
  }

  return (
    <CardShell className="p-5">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-label text-fg">Ny samtale</p>
          <p className="text-[12px] text-fg-muted">
            Har du et spørsmål til oss? Trykk — du trenger ikke velge noe.
          </p>
        </div>

        <StatefulButton
          type="button"
          className="w-full"
          icon={<LifeBuoy size={16} strokeWidth={1.75} />}
          disabled={opprett.isPending}
          onClick={skrivTilEndwise}
          state={
            opprett.isPending
              ? 'loading'
              : opprett.isError
                ? 'error'
                : opprett.isSuccess
                  ? 'success'
                  : 'idle'
          }
          loadingText="Åpner …"
          successText="Åpnet"
          errorText="Klarte ikke starte samtalen. Prøv igjen."
        >
          Skriv til Endwise
        </StatefulButton>

        <p className="text-[12px] text-fg-muted leading-relaxed">
          Meldingen går til Endwise-support. Ikke til kunder eller kollegaer.
        </p>

        {opprett.error && !annen && (
          <p className="flex items-start gap-2 text-body text-danger">
            <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            Klarte ikke starte samtalen. Prøv igjen.
          </p>
        )}

        <button
          type="button"
          onClick={() => setAnnen((v) => !v)}
          className="self-start text-[12px] text-fg-muted underline-offset-2 hover:text-fg hover:underline"
        >
          Annen samtale
        </button>

        {annen && (
          <form onSubmit={startAnnen} className="flex flex-col gap-3 border-border border-t pt-3">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-label text-fg">Hvem er samtalen med?</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {ANDRE_PARTER.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setAnnenKind(p.key)}
                    aria-pressed={annenKind === p.key}
                    className={`flex items-center gap-2 rounded-control border px-3 py-2.5 text-left text-label transition-colors ${
                      annenKind === p.key
                        ? 'border-fg bg-sidebar-active'
                        : 'border-border hover:bg-surface-2'
                    }`}
                  >
                    <p.icon size={16} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
                    {p.label}
                  </button>
                ))}
              </div>
            </fieldset>

            {opprett.error && (
              <p className="flex items-start gap-2 text-body text-danger">
                <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
                {opprett.error.message}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onLukk}
                className="h-control rounded-control px-3 text-label text-fg-muted transition-colors hover:text-fg"
              >
                Avbryt
              </button>
              <StatefulButton
                type="submit"
                disabled={opprett.isPending}
                state={
                  opprett.isPending
                    ? 'loading'
                    : opprett.isError
                      ? 'error'
                      : opprett.isSuccess
                        ? 'success'
                        : 'idle'
                }
                loadingText="Oppretter…"
                successText="Opprettet"
                errorText="Feilet"
              >
                Start samtale
              </StatefulButton>
            </div>
          </form>
        )}
      </div>
    </CardShell>
  );
}
