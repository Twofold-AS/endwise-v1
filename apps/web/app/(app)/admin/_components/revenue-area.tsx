'use client';

import { Area, AreaChart, Grid, Tooltip, XAxis, YAxis } from '@endwise/ui';
import { MRR_SERIES } from '../_data';

const CONFIG = { mrr: { label: 'MRR', color: 'green' } } as const;

/** MRR-trend (12 mnd) som dither-arealgraf med aura-bloom. Mock til Stripe koblet. */
export function RevenueArea() {
  return (
    <div className="h-64 w-full">
      <AreaChart
        data={MRR_SERIES}
        config={CONFIG}
        bloom="aura"
        margins={{ top: 16, right: 12, bottom: 24, left: 44 }}
      >
        <Grid horizontal />
        <XAxis dataKey="mnd" maxTicks={12} />
        <YAxis tickCount={4} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
        <Area dataKey="mrr" variant="gradient" />
        <Tooltip labelKey="mnd" valueFormatter={(v) => `${v.toLocaleString('nb-NO')} kr`} />
      </AreaChart>
    </div>
  );
}
