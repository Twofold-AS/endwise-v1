'use client';

import { DeaktivertHandling, FeltTekst, Seksjon, StatefulButton } from '@endwise/ui';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useOrgRole } from '../../../_lib/use-org-role';

/**
 * F22 / white label F5b — be om / godkjenne midlertidig skriving.
 * Handling uten tilgang er deaktivert, ikke skjult.
 */
export function JitPanel({ slug }: { slug: string }) {
  const { isEndwiseAdmin, userId } = useOrgRole();
  const oversikt = trpc.jit.oversikt.useQuery({ slug }, { enabled: Boolean(slug), retry: false });
  const sok = trpc.jit.sok.useMutation();
  const godkjenn = trpc.jit.godkjenn.useMutation();
  const avvis = trpc.jit.avvis.useMutation();
  const trekk = trpc.jit.trekk.useMutation();
  const utils = trpc.useUtils();
  const [grunn, setGrunn] = useState('');
  const [feil, setFeil] = useState<string | null>(null);

  async function oppdater() {
    await utils.jit.oversikt.invalidate({ slug });
  }

  async function beOm() {
    setFeil(null);
    try {
      await sok.mutateAsync({ slug, begrunnelse: grunn, varighetMinutter: 60 });
      setGrunn('');
      await oppdater();
    } catch (e) {
      setFeil(e instanceof Error ? e.message : 'Kunne ikke sende.');
    }
  }

  if (oversikt.isError) {
    return (
      <Seksjon tittel="Midlertidig tilgang">
        <p className="text-body text-fg-muted max-md:text-[16px]">
          Midlertidig skriving er ikke slått på ennå.
        </p>
      </Seksjon>
    );
  }

  const aktiv = oversikt.data?.aktiv;
  const vente = oversikt.data?.vente ?? [];
  const minVente = (oversikt.data?.mine ?? []).find((r) => r.status === 'venter');
  const kanSoke = !aktiv && !minVente;

  return (
    <Seksjon tittel="Midlertidig tilgang">
      <p className="text-body text-fg-muted max-md:text-[16px]">
        Support kan bare lese. Skriving krever begrunnelse, to godkjenninger og varsel til daglig
        leder. Ingen logger inn på verkstedet.
      </p>
      {aktiv ? (
        <p className="text-body text-fg max-md:text-[16px]">
          Du har skrive-tilgang til{' '}
          {aktiv.utloperAt
            ? new Date(aktiv.utloperAt).toLocaleTimeString('nb-NO', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'utløp'}
          .
        </p>
      ) : null}
      {minVente ? (
        <p className="text-body text-fg max-md:text-[16px]">Venter på to godkjenninger.</p>
      ) : null}
      {kanSoke ? (
        <FeltTekst
          label="Hvorfor trenger du å skrive?"
          value={grunn}
          onChange={setGrunn}
          rows={4}
          maxLength={500}
        />
      ) : null}
      {feil ? <p className="text-body text-danger">{feil}</p> : null}
      <div className="flex flex-wrap gap-3">
        {kanSoke ? (
          grunn.trim().length >= 20 ? (
            <StatefulButton
              type="button"
              state={sok.isPending ? 'loading' : 'idle'}
              onClick={() => void beOm()}
            >
              Be om skrive-tilgang
            </StatefulButton>
          ) : (
            <DeaktivertHandling forklaring="Skriv hvorfor, minst 20 tegn.">
              Be om skrive-tilgang
            </DeaktivertHandling>
          )
        ) : null}
        {minVente ? (
          <StatefulButton
            type="button"
            state={trekk.isPending ? 'loading' : 'idle'}
            onClick={() => void trekk.mutateAsync({ id: minVente.id }).then(oppdater)}
          >
            Trekk forespørsel
          </StatefulButton>
        ) : null}
        {aktiv ? (
          <StatefulButton
            type="button"
            state={trekk.isPending ? 'loading' : 'idle'}
            onClick={() => void trekk.mutateAsync({ id: aktiv.id }).then(oppdater)}
          >
            Avslutt tilgang
          </StatefulButton>
        ) : null}
      </div>
      {isEndwiseAdmin && vente.length > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-label text-fg">Venter på godkjenning</p>
          {vente.map((r) => {
            const selv = r.soktAv === userId || r.godkjenner1 === userId;
            return (
              <div key={r.id} className="flex flex-col gap-2 rounded-xl border border-border p-4">
                <p className="text-body text-fg max-md:text-[16px]">{r.begrunnelse}</p>
                <p className="text-meta text-fg-muted">{r.varighetMinutter} minutter</p>
                <div className="flex flex-wrap gap-3">
                  {selv ? (
                    <DeaktivertHandling forklaring="Du kan ikke godkjenne din egen eller en du allerede har godkjent.">
                      Godkjenn
                    </DeaktivertHandling>
                  ) : (
                    <StatefulButton
                      type="button"
                      state={godkjenn.isPending ? 'loading' : 'idle'}
                      onClick={() => void godkjenn.mutateAsync({ id: r.id }).then(oppdater)}
                    >
                      Godkjenn
                    </StatefulButton>
                  )}
                  {r.soktAv === userId ? (
                    <DeaktivertHandling forklaring="Du kan ikke avvise din egen forespørsel.">
                      Avvis
                    </DeaktivertHandling>
                  ) : (
                    <StatefulButton
                      type="button"
                      state={avvis.isPending ? 'loading' : 'idle'}
                      onClick={() => void avvis.mutateAsync({ id: r.id }).then(oppdater)}
                    >
                      Avvis
                    </StatefulButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </Seksjon>
  );
}
