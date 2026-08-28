'use client';

import { ShieldCheck } from '@endwise/ui';
import { trpc } from '@/lib/trpc';
import { useOrgRole } from '../../_lib/use-org-role';
import { AnsattePiller } from '../../_shell/ansatte-piller';
import { Feil, Laster } from '../../kunder/_delt';
import { Ferdighetskatalog } from './_katalog';

/**
 * F3-08 / F3-12 — Ansatte › Kompetanse.
 * Katalogen over hva som finnes. Tildeling per person bor på Team
 * (liste, detaljpane og Opprett ansatt). Prislisten peker hit.
 */
export default function KompetansePage() {
  const { isAdmin } = useOrgRole();
  const ferdigheter = trpc.competence.listSkills.useQuery();

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="sr-only">Kompetanse</h1>
        <p className="flex items-center gap-2 text-title text-fg">
          <ShieldCheck size={18} strokeWidth={1.75} className="text-fg-muted" />
          Kompetanse
        </p>
        <p className="text-body text-fg-muted">
          Ferdighetskatalogen. Hva som finnes her, tildeles på Team — ikke som en egen
          per-mekaniker-liste.
        </p>
        <div className="mt-3">
          <AnsattePiller />
        </div>
      </div>

      {ferdigheter.isLoading ? (
        <Laster />
      ) : ferdigheter.isError ? (
        <Feil melding={ferdigheter.error.message} />
      ) : (
        <Ferdighetskatalog ferdigheter={ferdigheter.data ?? []} kanEndre={isAdmin} />
      )}
    </div>
  );
}
