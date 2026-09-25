'use client';

import { Sidehode, Tomt } from '../_delt';
import { INGEN_API } from '../_hub';

/**
 * Claude §4.20 Bestill deler. Ingen order-API — ærlig stub.
 * Hellanor / MC-Import er ikke live integrasjoner.
 */
export default function BestillDelerPage() {
  return (
    <div data-lager-bestill className="mx-auto flex w-full max-w-[760px] flex-col gap-5 px-8 py-7">
      <Sidehode tittel="Bestill deler" undertittel="Bestilt og på vei. Ingen bestillings-API." />
      <Tomt
        tittel="Ingenting på vei"
        hint="Når et ordre-API finnes, vises åpne bestillinger her."
      />
      <fieldset className="flex flex-col gap-3 rounded-xl border border-border bg-bg p-4">
        <legend className="px-1 text-label text-fg">Ny bestilling</legend>
        <label className="flex flex-col gap-1">
          <span className="text-fg-faint text-xs">Del</span>
          <input
            disabled
            placeholder="Delenummer"
            className="h-control ew-felt ew-felt-md px-2.5"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-fg-faint text-xs">Antall</span>
          <input
            disabled
            type="number"
            placeholder="1"
            className="h-control ew-felt ew-felt-md px-2.5"
          />
        </label>
        <p data-ingen-api className="text-[12px] text-fg-muted">
          Send bestilling · {INGEN_API}. Leverandør-chips (Hellanor / MC-Import) er ikke koblet.
        </p>
      </fieldset>
    </div>
  );
}
