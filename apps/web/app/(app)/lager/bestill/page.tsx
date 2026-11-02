'use client';

import {
  DeaktivertHandling,
  FeltSelect,
  FeltTall,
  FilterChips,
  SelectItem,
  Side,
  TomFlate,
} from '@endwise/ui';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';

const LEVERANDORER = [
  { key: 'hellanor', label: 'Hellanor' },
  { key: 'mc-import', label: 'MC-Import' },
  { key: 'annen', label: 'Annen' },
] as const;

/**
 * Claude §4.20 Bestill deler. Skjemaet er bygget; sending er deaktivert.
 */
export default function BestillDelerPage() {
  const deler = trpc.inventory.listParts.useQuery({ limit: 50 });
  const [delId, setDelId] = useState<string>('');
  const [leverandor, setLeverandor] = useState<(typeof LEVERANDORER)[number]['key']>('hellanor');

  return (
    <div data-lager-bestill className="mx-auto flex w-full max-w-[760px] flex-col gap-5 px-8 py-7">
      <Side tittel="Bestill deler" undertekst="Bestilt og på vei.">
        {(deler.data ?? []).length === 0 && !deler.isLoading ? (
          <TomFlate tittel="Ingenting på vei" hint="Ingen åpne bestillinger." />
        ) : null}

        <form
          data-lager-bestill-skjema
          className="flex flex-col gap-3 rounded-xl border border-border bg-bg p-4"
          onSubmit={(e) => e.preventDefault()}
        >
          <FeltSelect
            label="Del"
            selectedKey={delId || null}
            onSelectionChange={(key) => setDelId(String(key ?? ''))}
            placeholder="Velg del"
          >
            {(deler.data ?? []).map((d) => (
              <SelectItem key={d.id} id={d.id}>
                {d.name} · {d.sku}
              </SelectItem>
            ))}
          </FeltSelect>
          <FeltTall label="Antall" defaultValue={1} minValue={1} />
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] text-fg-muted">Leverandør</span>
            <FilterChips
              chips={LEVERANDORER}
              valgt={leverandor}
              onChange={setLeverandor}
              ariaLabel="Leverandør"
            />
          </div>
          <DeaktivertHandling forklaring="Kommer senere" variant="default">
            Send bestilling
          </DeaktivertHandling>
        </form>
      </Side>
    </div>
  );
}
