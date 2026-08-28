'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useOrgRole } from '../_lib/use-org-role';
import { type FaneId, innstillingerHref, parseFane, synligeFaner } from './_faner';
import { ProfilFane } from './_profil-fane';
import { VarslerInnhold } from './varsler/_innhold';

/**
 * Innstillinger: Profil + Varsler. Ingen Abonnement/Koblinger/Tjenester her.
 */
export function InnstillingerSkall({ startFane }: { startFane?: FaneId }) {
  return (
    <Suspense
      fallback={<div className="px-8 py-7 text-body text-fg-muted">Laster innstillinger …</div>}
    >
      <InnstillingerSkallIndre startFane={startFane} />
    </Suspense>
  );
}

function InnstillingerSkallIndre({ startFane }: { startFane?: FaneId }) {
  const { isAdmin, erPlattform } = useOrgRole();
  const erForhandler = !erPlattform;
  const params = useSearchParams();
  const fraQuery = params?.get('fane');
  const aktiv = parseFane(fraQuery, isAdmin, startFane ?? 'profil', erForhandler);
  const faner = synligeFaner(isAdmin, erForhandler);
  const def = faner.find((f) => f.id === aktiv) ?? faner[0];

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="text-title text-fg">Innstillinger</h1>
        <p className="text-body text-fg-muted">
          Profil og varsler. Organisasjon ligger i sidebaren.
        </p>
      </div>

      {faner.length > 1 && (
        <div role="tablist" aria-label="Innstillinger" className="flex flex-wrap gap-1.5">
          {faner.map((f) => {
            const valgt = f.id === aktiv;
            return (
              <Link
                key={f.id}
                href={innstillingerHref(f.id) as Route}
                role="tab"
                aria-selected={valgt}
                scroll={false}
                className={`inline-flex h-control items-center rounded-pill px-3 text-label transition-colors ${
                  valgt
                    ? 'bg-fg text-bg'
                    : 'border border-border bg-bg text-fg-muted hover:bg-surface-2 hover:text-fg'
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      )}

      <section role="tabpanel" aria-label={def?.label ?? 'Profil'} className="flex flex-col gap-5">
        <div>
          <h2 className="text-title text-fg">{def?.label ?? 'Profil'}</h2>
          <p className="text-body text-fg-muted">{def?.ingress}</p>
        </div>
        <FaneInnhold fane={aktiv} />
      </section>
    </div>
  );
}

function FaneInnhold({ fane }: { fane: FaneId }) {
  switch (fane) {
    case 'profil':
      return <ProfilFane />;
    case 'varsler':
      return <VarslerInnhold />;
  }
}
