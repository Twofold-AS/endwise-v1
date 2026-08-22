import type { ReactNode } from 'react';
import { NewBadge } from '../_shell/cards';
import { BookingsTable } from '../dashboard/_components/bookings-table';
import { KpiCard } from '../dashboard/_components/kpi-card';
import { SectionCard } from '../dashboard/_components/section-card';
import { RevenueTable } from './_components/revenue-table';
import { ANALYTICS_KPIS, BOOKING_KPIS, REFERRERS, REVENUE_KPIS, TOP_PAGES } from './_data';

/**
 * ENDWISE-OVERSIKT (endwise_admin) — Endwise-INTERN forretningsoversikt: hva VI
 * tjener + plattformtall på tvers av forhandlere. Distinkt fra forhandlerens
 * egen Forhandler→Oversikt (/dashboard), som viser forhandlerens egne tall.
 *
 * Mock: Web Analytics (krever Vercel-deploy, F13-02) + Stripe-inntekt (krever
 * nøkler, F5-09). Ekte struktur: booking-aggregat (bookings-ruteren finnes).
 */
export default function EndwiseOverviewPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-8 px-8 py-7">
      <div>
        <h1 className="text-title text-fg">Endwise-oversikt</h1>
        <p className="text-body text-fg-muted">
          Intern forretningsoversikt (endwise_admin) — inntekt, trafikk og drift på tvers av alle
          forhandlere.
        </p>
      </div>

      {/* Inntekt (Stripe) — MOCK. Ikke live penger. */}
      <Group
        title="Inntekt (Stripe) — mocktall"
        badge
        note="Ikke ekte penger. Placeholder-tall, ikke live Stripe-omsetning. Ekte billing er F5-09."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {REVENUE_KPIS.map((k) => (
            <KpiCard key={k.key} kpi={k} />
          ))}
        </div>
        <SectionCard title="MRR-utvikling" subtitle="Siste 12 måneder">
          <RevenueTable />
        </SectionCard>
      </Group>

      {/* Web Analytics — MOCK */}
      <Group
        title="Web Analytics"
        badge
        note="Mock — Vercel Web Analytics samler KUN inn på deploy (ikke localhost). Oppsett: F13-02, personvern: F14-18."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ANALYTICS_KPIS.map((k) => (
            <KpiCard key={k.key} kpi={k} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard title="Topp-sider" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {TOP_PAGES.map((p) => (
                <li key={p.path} className="flex h-row items-center justify-between px-4 text-body">
                  <span className="truncate text-fg">{p.path}</span>
                  <span className="text-fg-muted tabular-nums">
                    {p.views.toLocaleString('nb-NO')}
                  </span>
                </li>
              ))}
            </ul>
          </SectionCard>
          <SectionCard title="Kilder (referrers)" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {REFERRERS.map((r) => (
                <li
                  key={r.source}
                  className="flex h-row items-center justify-between px-4 text-body"
                >
                  <span className="truncate text-fg">{r.source}</span>
                  <span className="text-fg-muted tabular-nums">
                    {r.visits.toLocaleString('nb-NO')}
                  </span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </Group>

      {/* Booking (aggregert) — EKTE backend, seed nå */}
      <Group
        title="Booking (aggregert)"
        note="Ekte backend (bookings-ruteren). Seed til web-tRPC-klienten er wiret."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BOOKING_KPIS.map((k) => (
            <KpiCard key={k.key} kpi={k} />
          ))}
        </div>
        <SectionCard title="Booking-flyt (alle forhandlere)" subtitle="Siste 30 dager">
          <BookingsTable />
        </SectionCard>
      </Group>
    </div>
  );
}

function Group({
  title,
  note,
  badge,
  children,
}: {
  title: string;
  note?: string;
  badge?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h2 className="text-title text-fg">{title}</h2>
        {badge && <NewBadge />}
        {note && <span className="ml-auto text-[12px] text-fg-muted">{note}</span>}
      </div>
      {children}
    </section>
  );
}
