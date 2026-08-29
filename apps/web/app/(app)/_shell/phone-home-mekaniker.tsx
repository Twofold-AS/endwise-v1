'use client';

import { useOrgRole } from '../_lib/use-org-role';
import { ForhandlerGrainientKort } from './forhandler-grainient';
import { MEKANIKER_TIMEPLAN_HREF, mekanikerHurtigKort, PHONE_KORT_META } from './phone-home';
import { PhoneKort } from './phone-kort';

/**
 * Mekanikerens telefon-hjem. Grainient-kort først, deretter destinasjonskort.
 * Dine jobber er egen side — ingen Min dag-hero, ingen Detaljer-accordion.
 */
export function PhoneHomeMekaniker() {
  const { shopEnabled } = useOrgRole();
  const hurtig = mekanikerHurtigKort(shopEnabled);

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col gap-3 px-3 py-3 md:hidden">
      <ForhandlerGrainientKort />
      <div className="grid grid-cols-2 gap-3">
        {hurtig.map((key) => {
          const dest = PHONE_KORT_META[key];
          const href = key === 'timeplan' ? MEKANIKER_TIMEPLAN_HREF : dest.href;
          return <PhoneKort key={key} href={href} icon={dest.icon} navn={dest.label} />;
        })}
      </div>
    </div>
  );
}
