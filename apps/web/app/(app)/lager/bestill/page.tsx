'use client';

import { Sidehode, Tomt } from '../_delt';

/**
 * Claude §4.20 Bestill deler. Bestilling er ikke tilgjengelig ennå.
 */
export default function BestillDelerPage() {
  return (
    <div data-lager-bestill className="mx-auto flex w-full max-w-[760px] flex-col gap-5 px-8 py-7">
      <Sidehode tittel="Bestill deler" undertittel="Bestilt og på vei." />
      <Tomt tittel="Ingenting på vei" hint="Bestilling er ikke tilgjengelig ennå." />
    </div>
  );
}
