'use client';

import { CircleAlert, StatefulButton } from '@endwise/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { InnstillingRad, InnstillingSeksjon } from '../_shell/innstilling-gruppe';
import { KjoretoyKaskade } from '../bookinger/_kjoretoy-kaskade';
import type { KjoretoyType } from '../bookinger/_kjoretoy-katalog';

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
  const [leggTilKjoretoy, setLeggTilKjoretoy] = useState(false);
  const [regnr, setRegnr] = useState('');
  const [vehType, setVehType] = useState<KjoretoyType>('mc');
  const [vehMerke, setVehMerke] = useState('');
  const [vehModell, setVehModell] = useState('');
  const [vehAr, setVehAr] = useState('');
  const alleKjoretoy = trpc.vehicles.list.useQuery({ limit: 200 });
  const opprettKjoretoy = trpc.vehicles.create.useMutation();

  const opprett = trpc.customers.create.useMutation({
    onSuccess: async (kunde) => {
      void utils.customers.list.invalidate();
      if (kunde?.id && leggTilKjoretoy && regnr.trim().length >= 2) {
        await opprettKjoretoy.mutateAsync({
          customerId: kunde.id,
          type: vehType,
          regNumber: regnr.trim(),
          make: vehMerke.trim() || undefined,
          model: vehModell.trim() || undefined,
          modelYear: vehAr.trim() || undefined,
        });
        void utils.vehicles.list.invalidate();
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

      <InnstillingSeksjon
        tittel="Kjøretøy"
        ingress="Valgfritt. Parent-skjemaet står mens du legger til."
      >
        <button
          type="button"
          onClick={() => setLeggTilKjoretoy((v) => !v)}
          className="self-start text-xs text-fg underline decoration-border underline-offset-2"
        >
          {leggTilKjoretoy ? 'Skjul kjøretøy' : 'Legg til kjøretøy'}
        </button>
        {leggTilKjoretoy ? (
          <div data-parent-park="veh" className="mt-3 flex flex-col gap-2">
            <InnstillingRad label="Regnr">
              <input
                value={regnr}
                onChange={(e) => setRegnr(e.target.value.toUpperCase())}
                className="h-control ew-felt ew-felt-md px-2.5"
                placeholder="EK12345"
              />
            </InnstillingRad>
            <KjoretoyKaskade
              type={vehType}
              merke={vehMerke}
              modell={vehModell}
              ar={vehAr}
              rader={alleKjoretoy.data ?? []}
              onType={setVehType}
              onMerke={setVehMerke}
              onModell={setVehModell}
              onAr={setVehAr}
            />
          </div>
        ) : null}
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
