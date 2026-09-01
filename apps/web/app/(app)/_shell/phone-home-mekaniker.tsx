'use client';

import { useOrgRole } from '../_lib/use-org-role';
import { DineJobberHjemKort } from '../dine-jobber/_hjem-kort';
import { ForhandlerGrainientKort } from './forhandler-grainient';
import { MEKANIKER_TIMEPLAN_HREF, mekanikerHurtigKort, PHONE_KORT_META } from './phone-home';
import { PhoneKort } from './phone-kort';

/**
 * Mekanikerens telefon-hjem. Grainient, stort Dine jobber-kort, Lager full
 * bredde, deretter små destinasjonskort. Ingen Min dag-hero, ingen accordion.
 */
export function PhoneHomeMekaniker() {
  const { shopEnabled } = useOrgRole();
  const hurtig = mekanikerHurtigKort(shopEnabled);
  const lager = PHONE_KORT_META.lager;

  return (
    <div
      data-hjem-hig="on"
      className="hjem-hig-flate mx-auto flex min-h-full w-full max-w-[520px] flex-col gap-4 md:max-w-[560px]"
    >
      <ForhandlerGrainientKort />
      <DineJobberHjemKort />
      <PhoneKort href={lager.href} icon={lager.icon} navn={lager.label} className="w-full" />
      <div className="grid grid-cols-2 gap-4">
        {hurtig.map((key) => {
          const dest = PHONE_KORT_META[key];
          const href = key === 'timeplan' ? MEKANIKER_TIMEPLAN_HREF : dest.href;
          return <PhoneKort key={key} href={href} icon={dest.icon} navn={dest.label} />;
        })}
      </div>
    </div>
  );
}
