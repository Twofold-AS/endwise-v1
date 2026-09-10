'use client';

import { CircleAlert, StatefulButton } from '@endwise/ui';
import { type FormEvent, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { InnstillingRad, InnstillingSeksjon } from '../../_shell/innstilling-gruppe';
import { type Kjoretoytype, parsePris, TYPE_VALG } from './_felles';
import { TjenesteFelter, TOMME_FELTER, type Versjonsfelter } from './_felter';

/**
 * F2-05 / F5-04 — ny tjeneste.
 * Oppretter `services`-raden og versjon 1 i samme kall (`services.create` gjør
 * begge i én transaksjon). En tjeneste uten versjon ville vært en tjeneste uten
 * varighet og pris — altså ikke bookbar.
 * Navn og kjøretøytype settes kun her. De hører til identiteten, ikke til
 * versjonen, og `update` tar dem derfor ikke imot.
 */
export function NyTjeneste({ onLukk }: { onLukk: () => void }) {
  const utils = trpc.useUtils();

  const [navn, setNavn] = useState('');
  const [type, setType] = useState<Kjoretoytype>('mc');
  const [felter, setFelter] = useState<Versjonsfelter>(TOMME_FELTER);
  const [prisfeil, setPrisfeil] = useState<string | null>(null);

  const opprett = trpc.services.create.useMutation({
    onSuccess: () => {
      void utils.services.list.invalidate();
      onLukk();
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const n = navn.trim();
    const varighet = Number(felter.varighet);
    if (!n || !Number.isFinite(varighet)) return;

    const pris = parsePris(felter.pris);
    if (!pris.ok) {
      setPrisfeil(pris.feil);
      return;
    }
    setPrisfeil(null);

    opprett.mutate({
      name: n,
      vehicleType: type,
      durationMinutes: Math.round(varighet),
      priceMinor: pris.ore,
      skills: felter.ferdigheter,
      description: felter.beskrivelse.trim() || undefined,
    });
  }

  const varighet = Number(felter.varighet);
  const kanLagre =
    Boolean(navn.trim()) &&
    Number.isFinite(varighet) &&
    varighet >= 5 &&
    varighet <= 480 &&
    !opprett.isPending;

  return (
    <form data-ny-tjeneste onSubmit={submit} className="flex flex-col gap-8">
      <InnstillingSeksjon
        tittel="Ny tjeneste"
        ingress="Dette blir versjon 1. Senere endringer lager nye versjoner — den første blir stående."
      >
        <InnstillingRad label="Navn">
          <input
            value={navn}
            onChange={(e) => setNavn(e.target.value)}
            maxLength={120}
            placeholder="EU-kontroll MC"
            className="h-control ew-felt ew-felt-md px-2.5"
          />
        </InnstillingRad>
        <InnstillingRad label="Gjelder" hint="Kan ikke endres senere." siste>
          <fieldset className="inline-flex h-control w-fit items-center gap-0.5 rounded-control border border-border bg-bg p-0.5">
            <legend className="sr-only">Kjøretøytype</legend>
            {TYPE_VALG.map((v) => (
              <label
                key={v.key}
                className={`inline-flex h-7 cursor-pointer items-center rounded-[7px] px-2.5 text-label transition-colors ${
                  type === v.key ? 'bg-sidebar-active text-fg' : 'text-fg-muted hover:text-fg'
                }`}
              >
                <input
                  type="radio"
                  name="kjoretoytype"
                  value={v.key}
                  checked={type === v.key}
                  onChange={() => setType(v.key)}
                  className="sr-only"
                />
                {v.label}
              </label>
            ))}
          </fieldset>
        </InnstillingRad>
      </InnstillingSeksjon>

      <InnstillingSeksjon tittel="Pris og varighet">
        <div className="py-2">
          <TjenesteFelter verdier={felter} onEndre={setFelter} />
        </div>
      </InnstillingSeksjon>

        {(prisfeil || opprett.error) && (
          <p className="flex items-start gap-2 text-body text-danger">
            <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            {prisfeil ?? opprett.error?.message}
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
            disabled={!kanLagre}
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
            Opprett tjeneste
          </StatefulButton>
        </div>
    </form>
  );
}
