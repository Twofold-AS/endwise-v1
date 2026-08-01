import type { ReactNode } from 'react';
import { NewBadge } from '../_shell/cards';
import { BookingsArea } from '../dashboard/_components/bookings-area';
import { KpiCard } from '../dashboard/_components/kpi-card';
import { SectionCard } from '../dashboard/_components/section-card';
import { RevenueArea } from './_components/revenue-area';
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
        <h1 className="font-semibold text-fg text-xl tracking-tight">Endwise-oversikt</h1>
        <p className="text-fg-muted text-sm">
          Intern forretningsoversikt (endwise_admin) — inntekt, trafikk og drift på tvers av alle
          forhandlere.
        </p>
      </div>

      {/* Inntekt (Stripe) — MOCK */}
      <Group
        title="Inntekt (Stripe)"
        badge
        note="Mock til Stripe er koblet (F5-09). Betalings-underdatabehandler: se GDPR-veikart §8b / F14-19."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {REVENUE_KPIS.map((k) => (
            <KpiCard key={k.key} kpi={k} />
          ))}
        </div>
        <SectionCard title="MRR-utvikling" subtitle="Siste 12 måneder">
          <RevenueArea />
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
                <li key={p.path} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="truncate text-fg">{p.path}</span>
                  <span className="tabular-nums text-fg-muted">
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
                  className="flex items-center justify-between px-4 py-2.5 text-sm"
                >
                  <span className="truncate text-fg">{r.source}</span>
                  <span className="tabular-nums text-fg-muted">
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
          <BookingsArea />
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
        <h2 className="font-semibold text-base text-fg">{title}</h2>
        {badge && <NewBadge />}
        {note && <span className="ml-auto text-fg-faint text-xs">{note}</span>}
      </div>
      {children}
    </section>
  );
}
