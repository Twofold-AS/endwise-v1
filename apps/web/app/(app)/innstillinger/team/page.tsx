'use client';

import { ChevronRight, Gauge, type LucideIcon, ShieldCheck, Users } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { CardShell } from '../../_shell/cards';
import { Funksjoner } from './_funksjoner';
import { Inviter } from './_inviter';
import { LeggTilUtenInvitasjon } from './_legg-til';

/**
 * F5-13 / F5-19 — Team. Egen sidebar-destinasjon under Ansatte (#41),
 * ikke Settings-fane. Mekaniker-administrasjonen bor her. Sidene under er
 * uendret — dette er inngangen, ikke en omskriving.
 */
const RADER: { icon: LucideIcon; title: string; body: string; href: string }[] = [
  {
    icon: Users,
    title: 'Mekanikere',
    body: 'Liste over mekanikere i verkstedet, med load og status.',
    href: '/mekanikere',
  },
  {
    icon: ShieldCheck,
    title: 'Kompetanse',
    body: 'Ferdigheter, gradert nivå og sertifisering med utløpsdato.',
    href: '/mekanikere/kompetanse',
  },
  {
    icon: Gauge,
    title: 'Timeplan',
    body: 'Arbeidstid og belegg per mekaniker.',
    href: '/mekanikere/kapasitet',
  },
];

export default function TeamPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="text-title text-fg">Team</h1>
        <p className="text-body text-fg-muted">
          Hvem jobber her, hva de har tilgang til, og hva de gjør. Tilgang håndheves server-side
          (RBAC, F1-05); funksjon styrer landingsvisning, ikke rettigheter. Invitasjon gir
          innlogging. «Legg til uten invitasjon» gir bare navnet i forhandlervisningen.
        </p>
      </div>

      <Inviter />

      <LeggTilUtenInvitasjon />

      <Funksjoner />

      <div className="overflow-hidden rounded-xl border border-border">
        {RADER.map((r, i) => (
          <Link key={r.href} href={r.href as Route} className="group block">
            <div
              className={`flex h-row-store items-center gap-3 bg-bg px-4 transition-colors group-hover:bg-surface-2 ${i > 0 ? 'border-border border-t' : ''}`}
            >
              <r.icon size={16} className="shrink-0 text-fg-muted" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-label text-fg">{r.title}</span>
                <span className="truncate text-[12px] text-fg-muted">{r.body}</span>
              </div>
              <ChevronRight size={16} className="shrink-0 text-fg-muted" aria-hidden />
            </div>
          </Link>
        ))}
      </div>

      <CardShell className="p-4">
        <p className="text-label text-fg">Tilgangsnivå</p>
        <p className="mt-1 text-[12px] text-fg-muted leading-relaxed">
          Invitasjoner gir alltid tilgangsnivået <b>ansatt</b>. Å gjøre noen til leder gjøres ikke
          herfra ennå. Jobbfunksjon styrer hvor folk lander, ikke hva de har lov til.
        </p>
      </CardShell>
    </div>
  );
}
