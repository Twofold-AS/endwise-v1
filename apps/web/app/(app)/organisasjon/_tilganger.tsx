'use client';

import {
  type Niva,
  OMRADER,
  OMRADER_NAVN,
  type Omrade,
  TILLATELSE_HINT,
} from '@endwise/modules/tillatelse';
import { DeaktivertHandling, FeltKode, LasterFlate, ListeRad } from '@endwise/ui';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useOrgRole } from '../_lib/use-org-role';
import { OpprettAnsattDialog } from './_opprett-dialog';

const NIVA_KNAPPER: Array<{ verdi: Niva | null; label: string }> = [
  { verdi: null, label: 'Ingen' },
  { verdi: 'se', label: 'Se' },
  { verdi: 'endre', label: 'Endre' },
];

function tidTekst(tid: Date | string) {
  return new Date(tid).toLocaleString('nb-NO', {
    timeZone: 'Europe/Oslo',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TilgangerFlate({
  apenNy,
  onLukkNy,
}: {
  apenNy?: boolean;
  onLukkNy?: () => void;
} = {}) {
  const { userId, isDealerAdmin, isEndwiseAdmin, isAdmin, isLoading } = useOrgRole();
  const kanEndre = isDealerAdmin || isEndwiseAdmin;
  const team = trpc.team.list.useQuery(undefined, { retry: false });
  const liste = trpc.tillatelse.liste.useQuery(undefined, { enabled: kanEndre, retry: false });
  const [totp, setTotp] = useState('');
  const [nyLokal, setNyLokal] = useState(false);
  const nyApen = apenNy ?? nyLokal;
  const lukkNy = onLukkNy ?? (() => setNyLokal(false));

  if (isLoading || team.isLoading || (kanEndre && liste.isLoading)) {
    return <LasterFlate label="Henter tilganger" />;
  }

  if (liste.isError) {
    return (
      <p className="text-body text-fg-muted">
        Tilganger vises når white label er slått på. {liste.error.message}
      </p>
    );
  }

  if (team.isError) {
    return <p className="text-body text-danger">{team.error.message}</p>;
  }

  const ansatte = (team.data ?? []).filter(
    (m) => m.rolle === 'dealer_staff' || m.rolle === 'dealer_admin',
  );
  const navnPer = new Map(ansatte.map((m) => [m.userId, m.navn || m.epost || m.userId]));
  const gitt = liste.data ?? [];
  const logg = [...gitt].sort((a, b) => +new Date(b.gittAt) - +new Date(a.gittAt)).slice(0, 12);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-body text-fg-muted">
        Se eller Endre per område. Endring virker med en gang. Ingen kan heve seg selv.
      </p>

      {kanEndre && !onLukkNy ? (
        <button
          type="button"
          onClick={() => setNyLokal(true)}
          className="inline-flex h-11 self-start items-center rounded-pill bg-fg px-4 text-label text-bg"
        >
          Ny ansatt
        </button>
      ) : null}
      {!kanEndre ? (
        <DeaktivertHandling forklaring={TILLATELSE_HINT}>Ny ansatt</DeaktivertHandling>
      ) : null}

      {kanEndre ? (
        <FeltKode aria-label="Autentikatorkode" length={6} value={totp} onChange={setTotp} />
      ) : (
        <DeaktivertHandling forklaring={TILLATELSE_HINT}>Autentikatorkode</DeaktivertHandling>
      )}

      {ansatte.length === 0 ? (
        <p className="text-body text-fg-muted">Ingen ansatte ennå.</p>
      ) : (
        ansatte.map((m) => (
          <AnsattMatrise
            key={m.userId}
            userId={m.userId}
            navn={m.navn || m.epost || 'Ansatt'}
            erLeder={m.rolle === 'dealer_admin'}
            erMeg={m.userId === userId}
            kanEndre={kanEndre}
            totp={totp}
            gitt={gitt.filter((g) => g.userId === m.userId)}
          />
        ))
      )}

      {isAdmin ? (
        <ListeRad
          tittel="Aktivitet fra Endwise"
          undertekst="Hva Endwise har gjort hos dere"
          href="/organisasjon?seksjon=aktivitet-endwise"
        />
      ) : null}

      <section className="flex flex-col gap-2" aria-label="Endringslogg">
        <h2 className="text-title text-fg">Sist endret</h2>
        {logg.length === 0 ? (
          <p className="text-body text-fg-muted">Ingen tillatelser er delt ut ennå.</p>
        ) : (
          logg.map((r) => (
            <ListeRad
              key={`${r.userId}-${r.omrade}`}
              tittel={`${navnPer.get(r.userId) ?? r.userId} · ${OMRADER_NAVN[r.omrade as Omrade] ?? r.omrade}`}
              undertekst={`${r.niva === 'endre' ? 'Endre' : 'Se'} · ${tidTekst(r.gittAt)}`}
              chevron={false}
            />
          ))
        )}
      </section>

      <OpprettAnsattDialog apen={nyApen} onLukk={lukkNy} />
    </div>
  );
}

function AnsattMatrise({
  userId,
  navn,
  erLeder,
  erMeg,
  kanEndre,
  totp,
  gitt,
}: {
  userId: string;
  navn: string;
  erLeder: boolean;
  erMeg: boolean;
  kanEndre: boolean;
  totp: string;
  gitt: Array<{ omrade: string; niva: string }>;
}) {
  const utils = trpc.useUtils();
  const sett = trpc.tillatelse.sett.useMutation({
    onSuccess: () => {
      void utils.tillatelse.liste.invalidate();
      void utils.tillatelse.mine.invalidate();
    },
  });
  const grunn = !kanEndre
    ? TILLATELSE_HINT
    : erMeg
      ? 'Du kan ikke endre egne tilganger'
      : erLeder
        ? 'Daglig leder har alle tilganger'
        : null;
  const las = Boolean(grunn);

  return (
    <section className="flex flex-col gap-3 border-border border-b pb-4">
      <h2 className="text-title text-fg">
        {navn}
        {erLeder ? ' · daglig leder' : ''}
        {erMeg ? ' · deg' : ''}
      </h2>
      {OMRADER.map((omrade) => {
        const niva = erLeder
          ? ('endre' as const)
          : ((gitt.find((g) => g.omrade === omrade)?.niva as Niva | undefined) ?? null);
        return (
          <div key={omrade} className="flex flex-col gap-2">
            <p className="text-label text-fg">{OMRADER_NAVN[omrade]}</p>
            <div className="flex flex-wrap gap-2">
              {NIVA_KNAPPER.map((k) =>
                las && grunn ? (
                  <DeaktivertHandling key={k.label} forklaring={grunn}>
                    {k.label}
                  </DeaktivertHandling>
                ) : (
                  <button
                    key={k.label}
                    type="button"
                    aria-pressed={niva === k.verdi}
                    disabled={sett.isPending || niva === k.verdi}
                    onClick={() =>
                      sett.mutate({
                        userId,
                        omrade,
                        niva: k.verdi,
                        totp,
                      })
                    }
                    className={`inline-flex h-11 min-w-16 items-center justify-center rounded-pill px-3 text-label ${
                      niva === k.verdi
                        ? 'bg-fg text-bg'
                        : 'border border-border text-fg disabled:opacity-40'
                    }`}
                  >
                    {k.label}
                  </button>
                ),
              )}
            </div>
          </div>
        );
      })}
      {sett.isError ? <p className="text-body text-danger">{sett.error.message}</p> : null}
    </section>
  );
}
