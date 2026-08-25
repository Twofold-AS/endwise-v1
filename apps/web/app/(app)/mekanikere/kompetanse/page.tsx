'use client';

import { ShieldCheck } from '@endwise/ui';
import { trpc } from '@/lib/trpc';
import { useOrgRole } from '../../_lib/use-org-role';
import { Feil, Laster, Tomt } from '../../kunder/_delt';
import { Ferdighetskatalog } from './_katalog';
import { MekanikerKompetanse } from './_mekaniker';

/**
 * F3-08 / F3-12 — Ansatte › Kompetanse.
 *
 * Samme register mekanikeren leser under Kompetanse. Lederen vedlikeholder
 * katalogen og nivå/sertifisering per mekaniker. Prislisten peker hit;
 * Tjenester & priser (det forhandleren betaler Endwise) gjør det ikke.
 */
export default function KompetansePage() {
  const { isAdmin } = useOrgRole();
  const mekanikere = trpc.mechanics.oversikt.useQuery();
  const ferdigheter = trpc.competence.listSkills.useQuery();
  const kompetanse = trpc.competence.listAllMechanicSkills.useQuery();

  const feil = mekanikere.error ?? ferdigheter.error ?? kompetanse.error;
  const laster = mekanikere.isLoading || ferdigheter.isLoading || kompetanse.isLoading;

  const perMek = new Map<string, NonNullable<typeof kompetanse.data>>();
  for (const rad of kompetanse.data ?? []) {
    const liste = perMek.get(rad.mechanicId) ?? [];
    liste.push(rad);
    perMek.set(rad.mechanicId, liste);
  }

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="sr-only">Kompetanse</h1>
        <p className="flex items-center gap-2 text-title text-fg">
          <ShieldCheck size={18} strokeWidth={1.75} className="text-fg-muted" />
          Kompetanse
        </p>
        <p className="text-body text-fg-muted">
          Ferdigheter, nivå og sertifisering per mekaniker. Samme register som på Min kompetanse.
        </p>
      </div>

      {laster ? (
        <Laster />
      ) : feil ? (
        <Feil melding={feil.message} />
      ) : (
        <>
          <Ferdighetskatalog ferdigheter={ferdigheter.data ?? []} kanEndre={isAdmin} />

          <section className="flex flex-col gap-2">
            <div>
              <h2 className="text-label text-fg">Per mekaniker</h2>
              <p className="text-[12px] text-fg-muted">
                Nivå 1–5 med ord, og sertifisering som kan utløpe. Utløpt sertifisering
                diskvalifiserer på jobber som krever den.
              </p>
            </div>
            {(mekanikere.data?.length ?? 0) === 0 ? (
              <Tomt
                tittel="Ingen mekanikere ennå"
                hint="Mekanikere opprettes når noen får jobbfunksjonen mekaniker, eller synkes inn."
              />
            ) : (
              <div className="flex flex-col gap-2">
                {mekanikere.data?.map((m) => (
                  <MekanikerKompetanse
                    key={m.id}
                    mekaniker={m}
                    ferdigheter={ferdigheter.data ?? []}
                    rader={perMek.get(m.id) ?? []}
                    kanEndre={isAdmin}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
