'use client';

import { CircleAlert, StatefulButton } from '@endwise/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { ClaudeAct } from '../_shell/claude-flate';
import { InnstillingRad, InnstillingSeksjon } from '../_shell/innstilling-gruppe';
import { arsmodeller, type KjoretoyTypeKey, merkerFor, modellerFor } from './_kjoretoy-kaskade';

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
  const [kjoretoy, setKjoretoy] = useState<
    { id: string; type: KjoretoyTypeKey; make: string; model: string; year: string; reg: string }[]
  >([]);
  const opprettKjoretoy = trpc.vehicles.create.useMutation();

  const opprett = trpc.customers.create.useMutation({
    onSuccess: async (kunde) => {
      if (kunde?.id) {
        for (const v of kjoretoy) {
          if (!v.make && !v.reg) continue;
          await opprettKjoretoy.mutateAsync({
            customerId: kunde.id,
            type: v.type,
            make: v.make || undefined,
            model: v.model || undefined,
            modelYear: v.year || undefined,
            regNumber: v.reg || undefined,
          });
        }
        void utils.customers.list.invalidate();
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

      <InnstillingSeksjon tittel="Kjøretøy" ingress="Valgfritt. Type → merke → modell → år.">
        {kjoretoy.map((v) => (
          <div key={v.id} className="flex flex-col gap-2 border-divide border-b py-3 last:border-0">
            <InnstillingRad label="Type">
              <select
                value={v.type}
                onChange={(e) => {
                  const type = e.target.value as KjoretoyTypeKey;
                  setKjoretoy((alle) =>
                    alle.map((x) =>
                      x.id === v.id ? { ...x, type, make: '', model: '', year: '' } : x,
                    ),
                  );
                }}
                className="h-control ew-felt ew-felt-md px-2.5"
              >
                <option value="mc">MC</option>
                <option value="boat">Båt</option>
                <option value="atv">ATV</option>
              </select>
            </InnstillingRad>
            <InnstillingRad label="Merke">
              <select
                value={v.make}
                onChange={(e) =>
                  setKjoretoy((alle) =>
                    alle.map((x) =>
                      x.id === v.id ? { ...x, make: e.target.value, model: '' } : x,
                    ),
                  )
                }
                className="h-control ew-felt ew-felt-md px-2.5"
              >
                <option value="">Velg merke</option>
                {merkerFor(v.type).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </InnstillingRad>
            <InnstillingRad label="Modell">
              <select
                value={v.model}
                onChange={(e) =>
                  setKjoretoy((alle) =>
                    alle.map((x) => (x.id === v.id ? { ...x, model: e.target.value } : x)),
                  )
                }
                className="h-control ew-felt ew-felt-md px-2.5"
              >
                <option value="">Velg modell</option>
                {modellerFor(v.type, v.make).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </InnstillingRad>
            <InnstillingRad label="Årsmodell">
              <select
                value={v.year}
                onChange={(e) =>
                  setKjoretoy((alle) =>
                    alle.map((x) => (x.id === v.id ? { ...x, year: e.target.value } : x)),
                  )
                }
                className="h-control ew-felt ew-felt-md px-2.5"
              >
                <option value="">År</option>
                {arsmodeller().map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </InnstillingRad>
            <InnstillingRad label="Reg.nr" siste>
              <input
                value={v.reg}
                onChange={(e) =>
                  setKjoretoy((alle) =>
                    alle.map((x) =>
                      x.id === v.id ? { ...x, reg: e.target.value.toUpperCase() } : x,
                    ),
                  )
                }
                placeholder="uten reg.nr"
                className="h-control ew-felt ew-felt-md px-2.5"
              />
            </InnstillingRad>
            <button
              type="button"
              className="self-start text-[13px] text-fg-muted"
              onClick={() => setKjoretoy((alle) => alle.filter((x) => x.id !== v.id))}
            >
              Fjern
            </button>
          </div>
        ))}
        <div className="pt-2">
          <ClaudeAct
            kind="ghost"
            onClick={() =>
              setKjoretoy((alle) => [
                ...alle,
                { id: crypto.randomUUID(), type: 'mc', make: '', model: '', year: '', reg: '' },
              ])
            }
          >
            Legg til kjøretøy
          </ClaudeAct>
        </div>
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
