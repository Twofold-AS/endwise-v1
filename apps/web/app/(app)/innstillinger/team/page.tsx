'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../../_shell/cards';
import { TeamDetaljer } from './_detaljer';
import { parseTeamFane, TEAM_FANER, teamHref } from './_faner';
import { OpprettAnsatt } from './_inviter';
import { TeamListe } from './_liste';
import { MekanikerePille } from './_mekanikere-pille';

/**
 * F5-13 / F5-19 / F1-10 — Team under Organisasjon.
 * Piller som Innstillinger (?fane=). Opprett ansatt på egen pille.
 */
export default function TeamPage() {
  return (
    <Suspense fallback={<div className="px-8 py-7 text-body text-fg-muted">Laster team …</div>}>
      <TeamSide />
    </Suspense>
  );
}

function TeamSide() {
  const params = useSearchParams();
  const fane = parseTeamFane(params?.get('fane'));
  const def = TEAM_FANER.find((f) => f.id === fane) ?? TEAM_FANER[0];
  const [valgtId, setValgtId] = useState<string | null>(null);
  const team = trpc.team.list.useQuery();
  const valgt = useMemo(
    () => (team.data ?? []).find((r) => r.userId === valgtId) ?? null,
    [team.data, valgtId],
  );

  return (
    <div className="flex min-h-0 flex-1">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-8 py-7">
        <div>
          <h1 className="text-title text-fg">Team</h1>
          <p className="text-body text-fg-muted">
            Hvem som jobber her. Med e-post får hen invitasjon. Uten e-post vises hen bare i
            forhandlervisningen.
          </p>
        </div>

        <div role="tablist" aria-label="Team" className="flex flex-wrap gap-1.5">
          {TEAM_FANER.map((f) => {
            const valgtFane = f.id === fane;
            return (
              <Link
                key={f.id}
                href={teamHref(f.id) as Route}
                role="tab"
                aria-selected={valgtFane}
                scroll={false}
                className={`inline-flex h-control items-center rounded-pill px-3 text-label transition-colors ${
                  valgtFane
                    ? 'bg-fg text-bg'
                    : 'border border-border bg-bg text-fg-muted hover:bg-surface-2 hover:text-fg'
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        {fane === 'opprett' ? (
          <section role="tabpanel" aria-label={def.label} className="flex flex-col gap-3">
            <div>
              <h2 className="text-title text-fg">{def.label}</h2>
              <p className="text-body text-fg-muted">{def.ingress}</p>
            </div>
            <OpprettAnsatt />
          </section>
        ) : (
          <section role="tabpanel" aria-label={def.label} className="flex flex-col gap-3">
            <div>
              <h2 className="text-title text-fg">{def.label}</h2>
              <p className="text-body text-fg-muted">{def.ingress}</p>
            </div>
            {fane === 'mekanikere' ? (
              <MekanikerePille valgtId={valgtId} onVelg={setValgtId} />
            ) : (
              <TeamListe fane={fane} valgtId={valgtId} onVelg={setValgtId} />
            )}
          </section>
        )}

        <CardShell className="p-4">
          <p className="text-label text-fg">Tilgangsnivå</p>
          <p className="mt-1 text-[12px] text-fg-muted leading-relaxed">
            Invitasjoner gir alltid tilgangsnivået <b>ansatt</b>. Å gjøre noen til leder gjøres ikke
            herfra ennå. Jobbfunksjon styrer hvor folk lander, ikke hva de har lov til.
          </p>
        </CardShell>
      </div>

      {fane !== 'opprett' ? (
        <TeamDetaljer rad={valgt} apen={Boolean(valgtId)} onLukk={() => setValgtId(null)} />
      ) : null}
    </div>
  );
}
