'use client';

import { CircleAlert, StatefulButton } from '@endwise/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../_shell/cards';

/**
 * F5-02 — «NY KUNDE». Quick action-en som ikke gjorde noe.
 *
 * ⚠️ **Dette var en død knapp.** «Ny kunde» i Handlinger-menyen pekte på
 * `/kunder?ny=1`, men kundesiden leste aldri den parameteren — akkurat samme
 * feil som `/innboks?ny=1` hadde fram til 07.08.2026. Du trykket, siden lastet,
 * og ingenting skjedde. `customers.create` har eksistert i backend hele tiden.
 *
 * Skjemaet er med vilje minimalt: navn er det eneste som kreves for å ha en
 * kunde i registeret. Telefon og e-post er valgfrie fordi de faktisk er det —
 * en kunde som kommer inn døra med en sykkel har ikke alltid oppgitt noen av
 * delene, og et påkrevd felt ville tvunget fram en oppdiktet verdi.
 */
export function NyKunde({ onLukk }: { onLukk: () => void }) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [navn, setNavn] = useState('');
  const [telefon, setTelefon] = useState('');
  const [epost, setEpost] = useState('');

  const opprett = trpc.customers.create.useMutation({
    onSuccess: (kunde) => {
      void utils.customers.list.invalidate();
      // Rett inn på kundekortet: den som nettopp opprettet en kunde skal som
      // regel gjøre noe MER med den (legge inn kjøretøy, en sak).
      if (kunde?.id) router.replace(`/kunder/${kunde.id}` as Route);
      else onLukk();
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const n = navn.trim();
    if (!n) return;
    opprett.mutate({
      name: n,
      // ⚠️ Tomme strenger må bli `undefined`, ikke ''. Zod-skjemaet krever en
      // gyldig e-post HVIS feltet er med — en tom streng ville blitt avvist.
      phone: telefon.trim() || undefined,
      email: epost.trim() || undefined,
    });
  }

  return (
    <CardShell className="p-5">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <p className="text-label text-fg">Ny kunde</p>
          <p className="text-[12px] text-fg-muted">
            Bare navnet er påkrevd. Telefon og e-post kan legges til senere.
          </p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-label text-fg">Navn</span>
          <input
            value={navn}
            onChange={(e) => setNavn(e.target.value)}
            maxLength={160}
            placeholder="Kari Nordmann"
            className="h-control rounded-control border border-border bg-bg px-2.5 text-body text-fg outline-none placeholder:text-fg-muted/60 focus-visible:border-fg"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-label text-fg">Telefon</span>
            <input
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              maxLength={32}
              placeholder="+4790000000"
              className="h-control rounded-control border border-border bg-bg px-2.5 text-body text-fg outline-none placeholder:text-fg-muted/60 focus-visible:border-fg"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-label text-fg">E-post</span>
            <input
              type="email"
              value={epost}
              onChange={(e) => setEpost(e.target.value)}
              placeholder="kari@example.no"
              className="h-control rounded-control border border-border bg-bg px-2.5 text-body text-fg outline-none placeholder:text-fg-muted/60 focus-visible:border-fg"
            />
          </label>
        </div>

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
            disabled={!navn.trim() || opprett.isPending}
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
            Opprett kunde
          </StatefulButton>
        </div>
      </form>
    </CardShell>
  );
}
