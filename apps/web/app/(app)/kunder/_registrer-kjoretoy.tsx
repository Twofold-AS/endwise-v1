'use client';

import { CircleAlert, StatefulButton } from '@endwise/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../_shell/cards';
import { TYPE_LABEL } from './_delt';

/**
 * Registrer kjøretøy — Settings-felt, ikke et dump av alle skjema.
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
  const [type, setType] = useState<'mc' | 'boat' | 'atv'>('mc');
  const [regNumber, setRegNumber] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');

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
    });
  }

  return (
    <div data-registrer-kjoretoy>
      <CardShell className="p-5">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <p className="text-label text-fg">Registrer kjøretøy</p>
            <p className="text-[12px] text-fg-muted">
              Regnr er påkrevd. Merke og modell kan fylles senere fra Vegvesenet.
            </p>
          </div>

          {fastKundeId ? null : (
            <label className="flex flex-col gap-1.5">
              <span className="text-label text-fg">Kunde</span>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="h-control ew-felt ew-felt-md px-2.5"
              >
                <option value="">Ingen eier ennå</option>
                {(kunder.data ?? []).map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-label text-fg">Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="h-control ew-felt ew-felt-md px-2.5"
            >
              {(['mc', 'boat', 'atv'] as const).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-label text-fg">Registreringsnummer</span>
            <input
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
              maxLength={10}
              placeholder="AB12345"
              className="h-control ew-felt ew-felt-md px-2.5"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-label text-fg">Merke</span>
              <input
                value={make}
                onChange={(e) => setMake(e.target.value)}
                maxLength={64}
                className="h-control ew-felt ew-felt-md px-2.5"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-label text-fg">Modell</span>
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                maxLength={64}
                className="h-control ew-felt ew-felt-md px-2.5"
              />
            </label>
          </div>

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
      </CardShell>
    </div>
  );
}
