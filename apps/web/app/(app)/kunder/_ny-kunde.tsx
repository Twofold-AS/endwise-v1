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
  const [regNumber, setRegNumber] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState<'mc' | 'boat' | 'atv'>('mc');

  const opprettKjoretoy = trpc.vehicles.create.useMutation();
  const opprett = trpc.customers.create.useMutation({
    onSuccess: async (kunde) => {
      void utils.customers.list.invalidate();
      void utils.customers.antall.invalidate();
      const reg = regNumber.trim();
      if (kunde?.id && reg) {
        try {
          await opprettKjoretoy.mutateAsync({
            type,
            regNumber: reg,
            customerId: kunde.id,
            make: make.trim() || undefined,
            model: model.trim() || undefined,
          });
          void utils.vehicles.list.invalidate();
        } catch {
          /* Kunden er lagret — kjøretøy kan legges til på kortet. */
        }
      }
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

      <InnstillingSeksjon tittel="Kjøretøy" ingress="Valgfritt. Kan legges til senere.">
        <InnstillingRad label="Type">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className="h-control ew-felt ew-felt-md px-2.5"
          >
            <option value="mc">MC</option>
            <option value="boat">Båt</option>
            <option value="atv">ATV</option>
          </select>
        </InnstillingRad>
        <InnstillingRad label="Registreringsnummer">
          <input
            value={regNumber}
            onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
            maxLength={10}
            placeholder="AB12345"
            className="h-control ew-felt ew-felt-md px-2.5"
          />
        </InnstillingRad>
        <InnstillingRad label="Merke">
          <input
            value={make}
            onChange={(e) => setMake(e.target.value)}
            maxLength={64}
            className="h-control ew-felt ew-felt-md px-2.5"
          />
        </InnstillingRad>
        <InnstillingRad label="Modell" siste>
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            maxLength={64}
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
          Lagre kunde
        </StatefulButton>
      </div>
    </form>
  );
}
