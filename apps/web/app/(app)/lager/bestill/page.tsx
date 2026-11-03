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
import { OpprettSkuff } from '../../_shell/opprett-skuff';

const LEVERANDORER = [
  { key: 'hellanor', label: 'Hellanor' },
  { key: 'mc-import', label: 'MC-Import' },
  { key: 'annen', label: 'Annen' },
] as const;

/**
 * Claude §4.20 Bestill deler. Liste + «Bestill annen del» i OpprettSkuff.
 * Sending er deaktivert — backend mangler.
 */
export default function BestillDelerPage() {
  const deler = trpc.inventory.listParts.useQuery({ limit: 50 });
  const [delId, setDelId] = useState<string>('');
  const [apen, setApen] = useState(false);
  const [leverandor, setLeverandor] = useState<(typeof LEVERANDORER)[number]['key']>('hellanor');

  return (
    <div data-lager-bestill className="mx-auto flex w-full max-w-[760px] flex-col gap-5 max-md:px-0 md:px-8 md:py-7">
      <Side
        tittel="Bestill deler"
        undertekst="Bestilt og på vei."
        tilbakeHref="/lager"
        handling={
          <button
            type="button"
            data-bestill-apne
            onClick={() => setApen(true)}
            className="inline-flex h-12 items-center justify-center rounded-pill border border-fg bg-bg px-4 text-body font-[650] text-fg"
          >
            Bestill annen del
          </button>
        }
      >
        <TomFlate tittel="Ingenting på vei" hint="Ingen åpne bestillinger." />

        <OpprettSkuff tittel="Bestill del" apen={apen} onLukk={() => setApen(false)} tvingSkuff>
          <form
            data-lager-bestill-skjema
            className="flex flex-col gap-3"
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
              <span className="text-label text-fg-muted">Leverandør</span>
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
        </OpprettSkuff>
      </Side>
    </div>
  );
}
