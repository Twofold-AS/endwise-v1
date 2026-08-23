'use client';

import {
  Building2,
  CircleAlert,
  Flag,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  ShieldCheck,
  Users,
} from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { useOrgRole } from '../_lib/use-org-role';
import { CardShell } from '../_shell/cards';
import { KjopteModulerTabell } from './_kjopte-moduler';

/**
 * F1-07 / F5-26 — ENDWISE-ADMIN OVERSIKT.
 *
 * Tidligere en redirect til /endwise/forhandlere. Landing er nå live KPI
 * fra Postgres (`tenants.census`), ikke mock inntektstall. Sperren er
 * `krevEndwiseAdminSide` i layout + `endwiseAdminProcedure` på rutene.
 *
 * Bookinger telles ikke: platform-admin-GUC-en åpner `tenants` og
 * SELECT på dealer_admin-tråder (F5-11), ikke bookinger.
 */

const LENKER = [
  {
    href: '/endwise/innboks' as Route,
    tittel: 'Innboks',
    tekst: 'Henvendelser fra verkstedene.',
    icon: Inbox,
    styring: false,
  },
  {
    href: '/endwise/team' as Route,
    tittel: 'Team',
    tekst: 'Eier, administrator og support.',
    icon: Users,
    styring: true,
  },
  {
    href: '/endwise/forhandlere' as Route,
    tittel: 'Forhandlere',
    tekst: 'Opprett og se tenants.',
    icon: Building2,
    styring: false,
  },
  {
    href: '/endwise/flagg' as Route,
    tittel: 'Feature-flags',
    tekst: 'Release-toggles — ikke kjøpte moduler.',
    icon: Flag,
    styring: true,
  },
  {
    href: '/endwise/helpdesk' as Route,
    tittel: 'Hjelpeartikler',
    tekst: 'Artikler som vises hos alle forhandlere.',
    icon: LifeBuoy,
    styring: true,
  },
  {
    href: '/endwise/innstillinger' as Route,
    tittel: 'Innstillinger',
    tekst: 'Dev-mode og plattformbrytere.',
    icon: Settings,
    styring: true,
  },
] as const;

export default function EndwiseOversiktPage() {
  const { isEndwiseAdmin } = useOrgRole();
  const census = trpc.tenants.census.useQuery(undefined, { retry: false });
  const moduler = trpc.tenants.listModules.useQuery(undefined, {
    retry: false,
    enabled: isEndwiseAdmin,
  });

  const feil = census.error ?? (isEndwiseAdmin ? moduler.error : undefined);
  const synligeLenker = LENKER.filter((l) => isEndwiseAdmin || !l.styring);

  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="sr-only">Endwise-admin · Oversikt</h1>
        <p className="text-title text-fg">Oversikt</p>
        <p className="text-body text-fg-muted">
          Live tall fra databasen. Null er ærlig — vi later ikke som det er omsetning her.
        </p>
      </div>

      {feil && (
        <p className="flex items-start gap-2 text-body text-danger">
          <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          {feil.message}
        </p>
      )}

      <section className="grid gap-2 sm:grid-cols-2">
        <Kpi
          label="Forhandlere"
          verdi={census.data?.forhandlere}
          laster={census.isLoading}
          hint={
            census.data
              ? `${census.data.forhandlereLive.toLocaleString('nb-NO')} live · ${census.data.forhandlereDemo.toLocaleString('nb-NO')} demo`
              : 'Tenants i Postgres'
          }
          icon={Building2}
        />
        <Kpi
          label="Brukere"
          verdi={census.data?.brukere}
          laster={census.isLoading}
          hint="Rader i user — globale identiteter"
          icon={Users}
        />
        <Kpi
          label="Aktive medlemskap"
          verdi={census.data?.medlemskap}
          laster={census.isLoading}
          hint="Rader i member — personer tilknyttet en org"
          icon={ShieldCheck}
        />
        <Kpi
          label="Bookinger"
          verdi={null}
          laster={false}
          hint="Ikke telt på tvers. RLS åpner ikke booking-rader for platform-admin."
          icon={LayoutDashboard}
          tom
        />
      </section>

      {isEndwiseAdmin ? (
        <CardShell className="p-5">
          <p className="text-label text-fg">Feature-flags er ikke entitlements</p>
          <p className="mt-1 text-[12px] text-fg-muted leading-relaxed">
            En bryter på{' '}
            <Link href={'/endwise/flagg' as Route} className="underline-offset-2 hover:underline">
              Feature-flags
            </Link>{' '}
            ruller ut en funksjon. Den gir ikke en forhandler en betalt modul. Kjøpte tillegg bor i{' '}
            <code>tenant_modules</code> og skrives bare av Stripe-webhooken (F5-32). Begge må si ja.
          </p>
        </CardShell>
      ) : null}

      {isEndwiseAdmin ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-title text-fg">Kjøpte moduler</h2>
          <p className="text-[12px] text-fg-muted leading-relaxed">
            Read-only. Vi skrur ikke på tillegg her. Plattform-org er ikke en forhandler.
          </p>
          <KjopteModulerTabell
            rader={moduler.data}
            laster={moduler.isLoading}
            feil={moduler.error?.message}
          />
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="text-title text-fg">Gå videre</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {synligeLenker.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-xl border border-border bg-card p-5 transition-colors hover:bg-sidebar-active"
            >
              <p className="flex items-center gap-2 text-label text-fg">
                <l.icon size={16} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
                {l.tittel}
              </p>
              <p className="mt-1 text-[12px] text-fg-muted leading-relaxed">{l.tekst}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label,
  verdi,
  hint,
  laster,
  icon: Icon,
  tom,
}: {
  label: string;
  verdi: number | null | undefined;
  hint: string;
  laster: boolean;
  icon: typeof Building2;
  tom?: boolean;
}) {
  return (
    <CardShell className="p-5">
      <p className="flex items-center gap-2 text-label text-fg-muted">
        <Icon size={16} strokeWidth={1.75} className="shrink-0" />
        {label}
      </p>
      <p className="mt-2 font-medium text-[24px] text-fg leading-none tabular-nums">
        {tom ? '—' : laster ? '…' : (verdi ?? 0).toLocaleString('nb-NO')}
      </p>
      <p className="mt-2 text-[12px] text-fg-muted leading-relaxed">{hint}</p>
    </CardShell>
  );
}
