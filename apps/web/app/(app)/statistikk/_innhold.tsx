'use client';

import { DitherGrowthChart, DitherStackedChart, RevenueLineChart } from '@endwise/ui';
import { useMemo } from 'react';
import { beleggFor, KILDE, trafikkFor, volumFor } from '../analyse/_data';
import type { StatistikkFaneId } from './_faner';

const INK = '#141414';
const ACTION = '#262626';
const OVERCAST = '#adadad';
const BLA = '#0066ff';

const VOLUM_BANDS = [
  { key: 'fullfort', label: 'Fullførte', color: ACTION },
  { key: 'avlyst', label: 'Avlyste', color: OVERCAST },
] as const;

export function StatistikkInnhold({ fane }: { fane: StatistikkFaneId }) {
  const volum = volumFor('7d');
  const belegg = beleggFor('7d');
  const trafikk = trafikkFor('7d');
  const volumRader = useMemo(
    () => volum.map((d) => ({ label: d.dag, fullfort: d.fullfort, avlyst: d.avlyst })),
    [volum],
  );

  if (fane === 'bookinger') {
    return (
      <Flate tittel="Bookingvolum" forklaring={KILDE.bookingvolum.forklaring}>
        <div className="h-52 w-full">
          <DitherStackedChart theme="light" compact rows={volumRader} bands={[...VOLUM_BANDS]} />
        </div>
      </Flate>
    );
  }

  if (fane === 'salg') {
    return (
      <Flate tittel="Belegg" forklaring={KILDE.belegg.forklaring}>
        <div className="h-52 w-full">
          <RevenueLineChart
            theme="light"
            compact
            series={[
              {
                key: 'belegg',
                label: 'Belegg',
                color: ACTION,
                data: belegg.map((b) => b.belegg),
                fill: true,
              },
            ]}
          />
        </div>
      </Flate>
    );
  }

  if (fane === 'nettside') {
    return (
      <Flate tittel="Sidevisninger" forklaring={KILDE.sidevisninger.forklaring}>
        <div className="h-52 w-full">
          <DitherGrowthChart
            theme="light"
            compact
            values={trafikk.map((t) => t.visninger)}
            labels={trafikk.map((t) => t.dag)}
            color={BLA}
          />
        </div>
      </Flate>
    );
  }

  return (
    <Flate tittel="Effektivitet" forklaring={KILDE.belegg.forklaring}>
      <div className="h-52 w-full">
        <RevenueLineChart
          theme="light"
          compact
          series={[
            {
              key: 'belegg',
              label: 'Belegg',
              color: ACTION,
              data: belegg.map((b) => b.belegg),
              fill: true,
            },
            {
              key: 'avlysning',
              label: 'Avlysningsrate',
              color: INK,
              data: belegg.map((b) => b.avlysning),
              fill: false,
            },
          ]}
        />
      </div>
    </Flate>
  );
}

function Flate({
  tittel,
  forklaring,
  children,
}: {
  tittel: string;
  forklaring: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-title text-fg md:hidden">{tittel}</p>
      <p className="text-[12px] text-fg-muted leading-relaxed">{forklaring}</p>
      {children}
    </div>
  );
}
