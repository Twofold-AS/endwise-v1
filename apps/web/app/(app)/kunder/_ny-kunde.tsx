'use client';

import { CircleAlert, StatefulButton } from '@endwise/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
  KjoretoyKaskade,
  type KjoretoyKaskadeVerdi,
  tomKaskade,
} from '../_innbygging/kjoretoy-kaskade';
import { KJORETOY_KAT_TIL_TYPE } from '../_innbygging/kjoretoy-katalog';
import { parkParent } from '../_innbygging/parent-form';
import { InnstillingRad, InnstillingSeksjon } from '../_shell/innstilling-gruppe';
import { TYPE_LABEL } from './_delt';

type KjoretoyType = 'mc' | 'boat' | 'atv';

type UtkastKjoretoy = {
  nøkkel: string;
  type: KjoretoyType;
  reg: string;
  merke: string;
  modell: string;
  aar: string;
};

function tomtKjoretoy(): UtkastKjoretoy {
  return {
    nøkkel: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'mc',
    reg: '',
    merke: '',
    modell: '',
    aar: '',
  };
}

function harKjoretoyInnhold(v: UtkastKjoretoy): boolean {
  return Boolean(v.reg.trim() || v.merke.trim() || v.modell.trim());
}

/**
 * «ny kunde». Quick action-en som ikke gjorde noe.
 * Innstillinger-inndeling: identitet, kontakt og kjøretøy (legg til / fjern).
 */
export function NyKunde({ onLukk }: { onLukk: () => void }) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [navn, setNavn] = useState('');
  const [telefon, setTelefon] = useState('');
  const [epost, setEpost] = useState('');
  const [kjoretoy, setKjoretoy] = useState<UtkastKjoretoy[]>([]);
  const [parentF, setParentF] = useState<{
    navn: string;
    telefon: string;
    epost: string;
    kjoretoy: UtkastKjoretoy[];
  } | null>(null);
  const [kaskade, setKaskade] = useState<KjoretoyKaskadeVerdi>(tomKaskade);

  const opprettKjoretoy = trpc.vehicles.create.useMutation();
  const opprett = trpc.customers.create.useMutation({
    onSuccess: async (kunde) => {
      void utils.customers.list.invalidate();
      void utils.customers.antall.invalidate();
      if (kunde?.id) {
        for (const v of kjoretoy.filter(harKjoretoyInnhold)) {
          try {
            await opprettKjoretoy.mutateAsync({
              type: v.type,
              customerId: kunde.id,
              regNumber: v.reg.trim() || undefined,
              make: v.merke.trim() || undefined,
              model: v.modell.trim() || undefined,
              modelYear: v.aar.trim() || undefined,
            });
          } catch {
            /* Kunden er lagret — kjøretøy kan legges til på kortet. */
          }
        }
        void utils.vehicles.list.invalidate();
        router.replace(`/kunder/${kunde.id}` as Route);
      } else onLukk();
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

  if (parentF) {
    return (
      <div data-ny-kunde-parentf className="flex flex-col gap-5">
        <InnstillingSeksjon
          tittel="Legg til kjøretøy"
          ingress="Ytre skjema er parkert. Kundefeltene forsvinner ikke."
        >
          <KjoretoyKaskade verdi={kaskade} onChange={setKaskade} />
        </InnstillingSeksjon>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setNavn(parentF.navn);
              setTelefon(parentF.telefon);
              setEpost(parentF.epost);
              setKjoretoy(parentF.kjoretoy);
              setParentF(null);
              setKaskade(tomKaskade());
            }}
            className="h-control rounded-control px-3 text-label text-fg-muted"
          >
            Tilbake
          </button>
          <button
            type="button"
            disabled={!kaskade.type || !kaskade.merke || !kaskade.modell || !kaskade.aar}
            onClick={() => {
              const type = kaskade.type ? KJORETOY_KAT_TIL_TYPE[kaskade.type] : 'mc';
              const neste = [
                ...parentF.kjoretoy,
                {
                  ...tomtKjoretoy(),
                  type,
                  merke: kaskade.merke,
                  modell: kaskade.modell,
                  aar: kaskade.aar,
                  reg: kaskade.reg,
                },
              ];
              setNavn(parentF.navn);
              setTelefon(parentF.telefon);
              setEpost(parentF.epost);
              setKjoretoy(neste);
              setParentF(null);
              setKaskade(tomKaskade());
            }}
            className="h-control rounded-full bg-fg px-3 text-label text-bg disabled:opacity-40"
          >
            Legg til kjøretøy
          </button>
        </div>
      </div>
    );
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
        {kjoretoy.length === 0 ? (
          <p className="px-1 py-2 text-[12px] text-fg-muted">Ingen kjøretøy lagt til ennå.</p>
        ) : (
          kjoretoy.map((v) => (
            <div
              key={v.nøkkel}
              data-ny-kunde-kjoretoy={v.nøkkel}
              className="flex items-center justify-between gap-2 py-2"
            >
              <p className="text-[12px] text-fg">
                {[v.merke, v.modell].filter(Boolean).join(' ') || TYPE_LABEL[v.type]}
                {v.aar ? ` · ${v.aar}` : ''}
                {v.reg ? ` · ${v.reg}` : ' · uten reg.nr'}
              </p>
              <button
                type="button"
                data-ny-kunde-fjern-kjoretoy={v.nøkkel}
                onClick={() => setKjoretoy((liste) => liste.filter((x) => x.nøkkel !== v.nøkkel))}
                className="shrink-0 text-[12px] text-fg-muted hover:text-fg"
              >
                Fjern
              </button>
            </div>
          ))
        )}
        <button
          type="button"
          data-ny-kunde-legg-til-kjoretoy
          onClick={() => {
            setParentF(parkParent({ navn, telefon, epost, kjoretoy }));
            setKaskade(tomKaskade());
          }}
          className="mt-2 text-label text-fg"
        >
          Legg til kjøretøy
        </button>
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
