'use client';

import { CircleAlert, StatefulButton } from '@endwise/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { trpc } from '@/lib/trpc';
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
          kjoretoy.map((v, i) => (
            <div key={v.nøkkel} data-ny-kunde-kjoretoy={v.nøkkel} className="flex flex-col">
              <InnstillingRad label="Type">
                <select
                  value={v.type}
                  onChange={(e) =>
                    setKjoretoy((liste) =>
                      liste.map((x) =>
                        x.nøkkel === v.nøkkel ? { ...x, type: e.target.value as KjoretoyType } : x,
                      ),
                    )
                  }
                  className="h-control ew-felt ew-felt-md px-2.5"
                >
                  <option value="mc">MC</option>
                  <option value="boat">Båt</option>
                  <option value="atv">ATV</option>
                </select>
              </InnstillingRad>
              <InnstillingRad label="Registreringsnummer">
                <input
                  value={v.reg}
                  onChange={(e) =>
                    setKjoretoy((liste) =>
                      liste.map((x) =>
                        x.nøkkel === v.nøkkel ? { ...x, reg: e.target.value.toUpperCase() } : x,
                      ),
                    )
                  }
                  maxLength={10}
                  placeholder="AB12345"
                  className="h-control ew-felt ew-felt-md px-2.5"
                />
              </InnstillingRad>
              <InnstillingRad label="Merke">
                <input
                  value={v.merke}
                  onChange={(e) =>
                    setKjoretoy((liste) =>
                      liste.map((x) =>
                        x.nøkkel === v.nøkkel ? { ...x, merke: e.target.value } : x,
                      ),
                    )
                  }
                  maxLength={64}
                  className="h-control ew-felt ew-felt-md px-2.5"
                />
              </InnstillingRad>
              <InnstillingRad label="Modell">
                <input
                  value={v.modell}
                  onChange={(e) =>
                    setKjoretoy((liste) =>
                      liste.map((x) =>
                        x.nøkkel === v.nøkkel ? { ...x, modell: e.target.value } : x,
                      ),
                    )
                  }
                  maxLength={64}
                  className="h-control ew-felt ew-felt-md px-2.5"
                />
              </InnstillingRad>
              <InnstillingRad label="År" siste={i === kjoretoy.length - 1}>
                <div className="flex items-center gap-2">
                  <input
                    value={v.aar}
                    onChange={(e) =>
                      setKjoretoy((liste) =>
                        liste.map((x) =>
                          x.nøkkel === v.nøkkel ? { ...x, aar: e.target.value } : x,
                        ),
                      )
                    }
                    maxLength={8}
                    placeholder="2021"
                    className="h-control min-w-0 flex-1 ew-felt ew-felt-md px-2.5"
                  />
                  <button
                    type="button"
                    data-ny-kunde-fjern-kjoretoy={v.nøkkel}
                    onClick={() =>
                      setKjoretoy((liste) => liste.filter((x) => x.nøkkel !== v.nøkkel))
                    }
                    className="shrink-0 text-[12px] text-fg-muted hover:text-fg"
                  >
                    Fjern
                  </button>
                </div>
              </InnstillingRad>
              {v.merke || v.modell ? (
                <p className="px-1 pb-2 text-[12px] text-fg-muted">
                  {[v.merke, v.modell].filter(Boolean).join(' ')} · {TYPE_LABEL[v.type]}
                  {v.aar ? ` · ${v.aar}` : ''}
                  {v.reg ? ` · ${v.reg}` : ' · uten reg.nr'}
                </p>
              ) : null}
            </div>
          ))
        )}
        <button
          type="button"
          data-ny-kunde-legg-til-kjoretoy
          onClick={() => setKjoretoy((liste) => [...liste, tomtKjoretoy()])}
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
