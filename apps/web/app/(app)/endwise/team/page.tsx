'use client';

import { Badge, StatefulButton } from '@endwise/ui';
import { type FormEvent, useState } from 'react';
import { Field, INPUT } from '@/app/_auth/felter';
import { trpc } from '@/lib/trpc';
import { useOrgRole } from '../../_lib/use-org-role';
import { CardShell } from '../../_shell/cards';

/**
 * Plattform-team. Tre nivåer på Endwise-org.
 * Support ser ikke denne siden. Eier kan ikke endres eller fjernes.
 */
const NIVATEKST = {
  eier: 'Eier',
  administrator: 'Administrator',
  support: 'Support',
} as const;

export default function EndwiseTeamPage() {
  const { isEndwiseAdmin, isLoading } = useOrgRole();
  const utils = trpc.useUtils();
  const liste = trpc.platformTeam.list.useQuery(undefined, { enabled: isEndwiseAdmin });
  const apne = trpc.platformTeam.invitasjoner.useQuery(undefined, { enabled: isEndwiseAdmin });
  const [epost, setEpost] = useState('');
  const [niva, setNiva] = useState<'administrator' | 'support'>('support');

  const inviter = trpc.platformTeam.inviter.useMutation({
    onSuccess: () => {
      void utils.platformTeam.invitasjoner.invalidate();
      setEpost('');
    },
  });
  const settNiva = trpc.platformTeam.settNiva.useMutation({
    onSuccess: () => {
      void utils.platformTeam.list.invalidate();
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    inviter.mutate({ epost: epost.trim(), niva });
  }

  if (!isLoading && !isEndwiseAdmin) {
    return (
      <div className="mx-auto max-w-[880px] px-8 py-7">
        <p className="text-body text-fg-muted">Support har ikke tilgang til team.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="text-title text-fg">Team</h1>
        <p className="text-body text-fg-muted">
          Endwise-plattformen. Tre nivåer: eier, administrator og support. Ikke forhandlerens
          leder/selger/support/mekaniker.
        </p>
      </div>

      <CardShell className="p-5">
        <p className="text-label text-fg">Inviter</p>
        <p className="mt-1 text-[12px] text-fg-muted leading-relaxed">
          Eier kan ikke inviteres. Administrator får forhandlere, flagg, helpdesk og team. Support
          får innboks og Se verkstedet (kun lesing).
        </p>
        <form onSubmit={submit} className="mt-3 flex flex-col gap-3">
          <Field id="ew-team-epost" label="E-post">
            <input
              id="ew-team-epost"
              type="email"
              required
              value={epost}
              onChange={(ev) => setEpost(ev.target.value)}
              className={INPUT}
              placeholder="kollega@twofold.no"
            />
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-label text-fg">Nivå</legend>
            <label className="flex items-center gap-2 text-body">
              <input
                type="radio"
                name="niva"
                checked={niva === 'administrator'}
                onChange={() => setNiva('administrator')}
              />
              Administrator
            </label>
            <label className="flex items-center gap-2 text-body">
              <input
                type="radio"
                name="niva"
                checked={niva === 'support'}
                onChange={() => setNiva('support')}
              />
              Support
            </label>
          </fieldset>
          <StatefulButton
            type="submit"
            state={inviter.isPending ? 'loading' : inviter.isSuccess ? 'success' : 'idle'}
            loadingText="Sender …"
            successText="Sendt"
          >
            Send invitasjon
          </StatefulButton>
          {inviter.isError ? (
            <p className="text-[12px] text-danger">{inviter.error.message}</p>
          ) : null}
        </form>
      </CardShell>

      <section className="flex flex-col gap-2">
        <h2 className="text-title text-fg">Medlemmer</h2>
        {liste.isError ? (
          <p className="text-body text-danger">{liste.error.message}</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            {(liste.data ?? []).map((m, i) => (
              <div
                key={m.userId}
                className={`flex flex-wrap items-center gap-3 bg-bg px-4 py-3 ${
                  i > 0 ? 'border-border border-t' : ''
                }`}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-label text-fg">{m.navn || '—'}</span>
                  <span className="truncate text-[12px] text-fg-muted">{m.epost}</span>
                </div>
                <span className="text-label text-fg">{m.niva ? NIVATEKST[m.niva] : m.rolle}</span>
                {m.hovedAdmin ? <Badge variant="secondary">Hoved-admin</Badge> : null}
                {m.kanEndres ? (
                  <select
                    className="h-control rounded-control border border-border bg-bg px-2 text-[12px]"
                    value={m.niva === 'support' ? 'support' : 'administrator'}
                    onChange={(ev) =>
                      settNiva.mutate({
                        userId: m.userId,
                        niva: ev.target.value as 'administrator' | 'support',
                      })
                    }
                    aria-label={`Endre nivå for ${m.navn}`}
                  >
                    <option value="administrator">Administrator</option>
                    <option value="support">Support</option>
                  </select>
                ) : (
                  <span className="text-[12px] text-fg-muted">Endre nivå ikke tilgjengelig</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {(apne.data?.length ?? 0) > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-title text-fg">Åpne invitasjoner</h2>
          <div className="overflow-hidden rounded-xl border border-border">
            {apne.data?.map((r, i) => (
              <div
                key={r.id}
                className={`flex items-center gap-3 bg-bg px-4 py-3 ${
                  i > 0 ? 'border-border border-t' : ''
                }`}
              >
                <span className="flex-1 truncate text-label text-fg">{r.epost}</span>
                <span className="text-[12px] text-fg-muted">{r.niva}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
