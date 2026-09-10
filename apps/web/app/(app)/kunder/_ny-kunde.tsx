'use client';

import { CircleAlert, StatefulButton } from '@endwise/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { InnstillingRad, InnstillingSeksjon } from '../_shell/innstilling-gruppe';

/**
 * «ny kunde». Quick action-en som ikke gjorde noe.
 * Innstillinger-inndeling: identitet og kontakt i egne grupper.
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
      phone: telefon.trim() || undefined,
      email: epost.trim() || undefined,
    });
  }

  return (
    <form data-ny-kunde onSubmit={submit} className="flex flex-col gap-8">
      <InnstillingSeksjon
        tittel="Ny kunde"
        ingress="Bare navnet er påkrevd. Telefon og e-post kan legges til senere."
      >
        <InnstillingRad label="Navn" siste>
          <input
            value={navn}
            onChange={(e) => setNavn(e.target.value)}
            maxLength={160}
            placeholder="Kari Nordmann"
            className="h-control ew-felt ew-felt-md px-2.5"
          />
        </InnstillingRad>
      </InnstillingSeksjon>

      <InnstillingSeksjon tittel="Kontakt">
        <InnstillingRad label="Telefon">
          <input
            value={telefon}
            onChange={(e) => setTelefon(e.target.value)}
            maxLength={32}
            placeholder="+4790000000"
            className="h-control ew-felt ew-felt-md px-2.5"
          />
        </InnstillingRad>
        <InnstillingRad label="E-post" siste>
          <input
            type="email"
            value={epost}
            onChange={(e) => setEpost(e.target.value)}
            placeholder="kari@example.no"
            className="h-control ew-felt ew-felt-md px-2.5"
          />
        </InnstillingRad>
      </InnstillingSeksjon>

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
  );
}
