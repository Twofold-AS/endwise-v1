'use client';

import { CircleAlert, FeltSelect, SelectItem, StatefulButton } from '@endwise/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { InnstillingRad, InnstillingSeksjon } from '../_shell/innstilling-gruppe';
import { KjoretoyKaskade } from '../bookinger/_kjoretoy-kaskade';
import type { KjoretoyType } from '../bookinger/_kjoretoy-katalog';
import { TYPE_LABEL } from './_delt';

/**
 * Registrer kjøretøy — Innstillinger-feltgrupper, ikke CardShell-dump.
 */
export function RegistrerKjoretoy({
  fastKundeId,
  onFerdig,
}: {
  fastKundeId?: string;
  onFerdig?: () => void;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const kunder = trpc.customers.list.useQuery({ sorter: 'navn', limit: 200 });

  const [customerId, setCustomerId] = useState(fastKundeId ?? '');
  const [type, setType] = useState<KjoretoyType>('mc');
  const [regNumber, setRegNumber] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [ar, setAr] = useState('');
  const alleKjoretoy = trpc.vehicles.list.useQuery({ limit: 200 });

  const opprett = trpc.vehicles.create.useMutation({
    onSuccess: (v) => {
      void utils.vehicles.list.invalidate();
      if (customerId) {
        void utils.customers.byId.invalidate({ id: customerId });
        void utils.customers.list.invalidate();
      }
      if (onFerdig) onFerdig();
      else if (v?.id) router.replace(`/kjoretoy/${v.id}` as Route);
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const reg = regNumber.trim();
    if (!reg) return;
    opprett.mutate({
      type,
      regNumber: reg,
      customerId: customerId || undefined,
      make: make.trim() || undefined,
      model: model.trim() || undefined,
      modelYear: ar.trim() || undefined,
    });
  }

  return (
    <form data-registrer-kjoretoy onSubmit={submit} className="flex flex-col gap-8">
      <InnstillingSeksjon
        tittel="Registrer kjøretøy"
        ingress="Regnr er påkrevd. Merke og modell kan fylles senere fra Vegvesenet."
      >
        {fastKundeId ? null : (
          <InnstillingRad label="Kunde">
            <FeltSelect
              aria-label="Kunde"
              selectedKey={customerId || null}
              onSelectionChange={(key) => setCustomerId(String(key ?? ''))}
              placeholder="Ingen eier ennå"
            >
              {(kunder.data ?? []).map((k) => (
                <SelectItem key={k.id} id={k.id}>
                  {k.name}
                </SelectItem>
              ))}
            </FeltSelect>
          </InnstillingRad>
        )}
        <InnstillingRad label="Type">
          <span className="sr-only">{TYPE_LABEL[type]}</span>
          <KjoretoyKaskade
            type={type}
            merke={make}
            modell={model}
            ar={ar}
            rader={alleKjoretoy.data ?? []}
            onType={setType}
            onMerke={setMake}
            onModell={setModel}
            onAr={setAr}
          />
        </InnstillingRad>
        <InnstillingRad label="Registreringsnummer" siste>
          <input
            value={regNumber}
            onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
            maxLength={10}
            placeholder="AB12345"
            className="h-control ew-felt ew-felt-md px-2.5"
          />
        </InnstillingRad>
      </InnstillingSeksjon>

      {opprett.error ? (
        <p className="flex items-start gap-2 text-body text-danger">
          <CircleAlert size={15} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          {opprett.error.message}
        </p>
      ) : null}

      <div className="flex justify-end">
        <StatefulButton
          type="submit"
          disabled={!regNumber.trim() || opprett.isPending}
          state={opprett.isPending ? 'loading' : opprett.isError ? 'error' : 'idle'}
          loadingText="Lagrer…"
          errorText="Feilet"
        >
          Registrer
        </StatefulButton>
      </div>
    </form>
  );
}
