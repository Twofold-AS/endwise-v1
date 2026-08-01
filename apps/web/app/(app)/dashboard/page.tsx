'use client';

import { Button, Plus } from '@endwise/ui';
import { BookingsArea } from './_components/bookings-area';
import { DealerList } from './_components/dealer-list';
import { KpiCard } from './_components/kpi-card';
import { SectionCard } from './_components/section-card';
import { KPIS } from './_data';

/**
 * Admin-oversikt (F3-05/F5-01/F5-10). Ikke TheFolds chat-hjemmeskjerm — dette
 * er verkstedets drift-oversikt: KPI-er, booking-flyt og forhandlerliste, med
 * dither-kit AKTIVT som bærende visuelt uttrykk. Data er seed (se _data.ts);
 * visualiseringene er ekte dither-kit.
 */
export default function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-8 py-7">
      {/* Side-header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-semibold text-xl text-fg tracking-tight">Oversikt</h1>
          <p className="text-sm text-fg-muted">Drift på tvers av forhandlerne dine</p>
        </div>
        <Button className="gap-2" size="sm">
          <Plus size={15} />
          Ny booking
        </Button>
      </div>

      {/* KPI-rad — dither som kortbakgrunn, tall oppå. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((kpi) => (
          <KpiCard key={kpi.key} kpi={kpi} />
        ))}
      </div>

      {/* Bærende arealgraf + forhandlerliste. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard title="Booking-flyt" subtitle="Siste 30 dager · fullført, planlagt, avlyst">
            <BookingsArea />
          </SectionCard>
        </div>
        <SectionCard title="Forhandlere" subtitle="Aktivitet siste 9 uker" bodyClassName="p-0">
          <DealerList />
        </SectionCard>
      </div>
    </div>
  );
}
