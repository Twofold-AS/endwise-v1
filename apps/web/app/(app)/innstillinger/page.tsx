'use client';

import {
  ArrowLeftRight,
  Bell,
  Blocks,
  ChevronRight,
  CreditCard,
  type LucideIcon,
  Receipt,
  UserCog,
} from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useOrgRole } from '../_lib/use-org-role';
import { CardShell } from '../_shell/cards';

/**
 * F5-19 — SETTINGS. All konfigurasjon, forankret nederst i sidebaren.
 *
 * **Prinsippet, og det viktigste på denne siden:** konfigurasjon bor her,
 * filtrering og sortering bor på selve sidene. Et filter som ligger i
 * innstillingene er et filter ingen finner; en innstilling som ligger på en
 * liste er en innstilling noen endrer ved et uhell.
 */
type Seksjon = {
  icon: LucideIcon;
  title: string;
  body: string;
  href: string;
  adminOnly?: boolean;
};

const SEKSJONER: Seksjon[] = [
  {
    icon: CreditCard,
    title: 'Abonnement',
    body: 'Plan, moduler og fakturering. Kjøp og aktiver nye løsninger.',
    href: '/abonnement',
    adminOnly: true,
  },
  {
    icon: Bell,
    title: 'Varsler',
    body: 'Kanaler og preferanser for SMS og e-post.',
    href: '/innstillinger/varsler',
  },
  {
    icon: UserCog,
    title: 'Team & tilgang',
    body: 'Brukere, roller, invitasjoner — og mekanikerne med kompetanse og kapasitet.',
    href: '/innstillinger/team',
    adminOnly: true,
  },
  {
    icon: Receipt,
    title: 'Tjenester & priser',
    body: 'Tjenestekatalog, varighet og prising.',
    href: '/innstillinger/tjenester',
    adminOnly: true,
  },
  {
    icon: Blocks,
    title: 'Integrasjoner',
    body: 'Vegvesen, Quick, Twilio og Resend.',
    href: '/integrasjoner',
    adminOnly: true,
  },
  {
    icon: UserCog,
    title: 'Profil',
    body: 'Din bruker, passord, tofaktor og tema.',
    href: '/innstillinger/profil',
  },
];

export default function InnstillingerPage() {
  const { isAdmin, isMechanic } = useOrgRole();
  const synlige = SEKSJONER.filter((s) => !s.adminOnly || isAdmin);

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="text-title text-fg">Settings</h1>
        <p className="text-body text-fg-muted">
          All konfigurasjon ett sted. Filtrering og sortering ligger på sidene der du jobber.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {synlige.map((s) => (
          <Link key={s.href} href={s.href as Route} className="group">
            <CardShell className="transition-colors group-hover:border-border-strong">
              <div className="flex items-start gap-3 p-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-surface-2 text-fg-muted">
                  <s.icon size={16} strokeWidth={1.75} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="text-label text-fg">{s.title}</p>
                  <p className="text-[12px] text-fg-muted leading-relaxed">{s.body}</p>
                </div>
                <ChevronRight size={16} className="mt-1 shrink-0 text-fg-muted" aria-hidden />
              </div>
            </CardShell>
          </Link>
        ))}
      </div>

      {/* Kontobytte — speiler kontekst-dropdownen i sidebarens topp. To
          innganger til samme handling er bevisst: den øverst er hurtig, denne
          er den man finner når man leter. */}
      <CardShell>
        <div className="flex items-center gap-3 p-4">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-surface-2 text-fg-muted">
            <ArrowLeftRight size={16} strokeWidth={1.75} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-label text-fg">Bytt konto: forhandler / mekaniker</p>
            <p className="text-[12px] text-fg-muted leading-relaxed">
              {isMechanic
                ? 'Du har mekanikerprofil — bytt visning i dropdownen øverst i sidebaren.'
                : 'Du har ingen mekanikerprofil på denne kontoen, så mekanikervisningen er ikke tilgjengelig.'}
            </p>
          </div>
        </div>
      </CardShell>
    </div>
  );
}
