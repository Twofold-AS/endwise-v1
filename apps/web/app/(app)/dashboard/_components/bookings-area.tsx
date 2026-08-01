'use client';

import { Area, AreaChart, Grid, Legend, Tooltip, XAxis, YAxis } from '@endwise/ui';
import { BOOKINGS_30D } from '../_data';

// Serie → farge/etikett. Grønn (aksenten) bærer «fullført» — hovedhistorien.
const CONFIG = {
  fullfort: { label: 'Fullført', color: 'green' },
  planlagt: { label: 'Planlagt', color: 'blue' },
  avlyst: { label: 'Avlyst', color: 'grey' },
} as const;

/**
 * Bærende element på oversikten: stablet dither-arealgraf over 30 dager, med
 * aura-bloom. Ekte dither-kit (AreaChart + Area-serier + akser + legende +
 * tooltip) — ingen placeholder. Aksene og tooltip gir tallene i klartekst.
 */
export function BookingsArea() {
  return (
    <div className="h-72 w-full">
      <AreaChart
        data={BOOKINGS_30D}
        config={CONFIG}
        stackType="default"
        bloom="aura"
        margins={{ top: 16, right: 12, bottom: 24, left: 32 }}
      >
        <Grid horizontal />
        <XAxis dataKey="dag" maxTicks={8} />
        <YAxis tickCount={4} />
        <Area dataKey="fullfort" variant="gradient" isClickable />
        <Area dataKey="planlagt" variant="gradient" isClickable />
        <Area dataKey="avlyst" variant="hatched" isClickable />
        <Legend isClickable align="right" />
        <Tooltip labelKey="dag" valueFormatter={(v, name) => `${name}: ${v}`} />
      </AreaChart>
    </div>
  );
}
