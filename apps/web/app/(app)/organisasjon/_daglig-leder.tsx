'use client';

import { FeltKode, StatefulButton } from '@endwise/ui';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Field, INPUT } from '../../_auth/felter';

export function DagligLederFlate() {
  const status = trpc.eier.status.useQuery();
  const team = trpc.team.list.useQuery();
  const sett = trpc.eier.settStedfortreder.useMutation({
    onSuccess: () => void status.refetch(),
  });
  const overfor = trpc.eier.overfor.useMutation();
  const [stedId, setStedId] = useState('');
  const [tilId, setTilId] = useState('');
  const [totpSted, setTotpSted] = useState('');
  const [totpOverfor, setTotpOverfor] = useState('');

  const ansatte = (team.data ?? []).filter((m) => m.rolle === 'dealer_staff');
  const kanLede = status.data?.erLeder === true;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-body text-fg-muted">
        Én daglig leder. Overføring krever tofaktor. Stedfortreder kan bare starte nødprosess.
      </p>
      {status.data?.apen ? (
        <p className="text-body text-fg-muted">
          Åpen overføring ({status.data.apen.kind}): {status.data.apen.status}
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-title text-fg">Stedfortreder</h2>
        <select
          className={INPUT}
          value={stedId}
          onChange={(e) => setStedId(e.target.value)}
          disabled={!kanLede}
          aria-label="Stedfortreder"
        >
          <option value="">Velg ansatt</option>
          {ansatte.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.navn || m.epost}
            </option>
          ))}
        </select>
        <FeltKode
          aria-label="Autentikatorkode"
          length={6}
          value={totpSted}
          onChange={setTotpSted}
          isDisabled={!kanLede}
        />
        <StatefulButton
          type="button"
          disabled={!kanLede || !stedId || totpSted.length < 6 || sett.isPending}
          state={sett.isPending ? 'loading' : 'idle'}
          loadingText=""
          successText=""
          errorText="Prøv igjen"
          onClick={() => sett.mutate({ userId: stedId, totp: totpSted })}
        >
          Sett stedfortreder
        </StatefulButton>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-title text-fg">Overfør rollen</h2>
        <select
          className={INPUT}
          value={tilId}
          onChange={(e) => setTilId(e.target.value)}
          disabled={!kanLede}
          aria-label="Ny daglig leder"
        >
          <option value="">Velg ansatt med tofaktor</option>
          {ansatte
            .filter((m) => m.twoFactorEnabled)
            .map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.navn || m.epost}
              </option>
            ))}
        </select>
        <Field id="eier-totp" label="Autentikatorkode">
          <input
            id="eier-totp"
            value={totpOverfor}
            onChange={(e) => setTotpOverfor(e.target.value)}
            className={INPUT}
            inputMode="numeric"
            autoComplete="one-time-code"
            disabled={!kanLede}
          />
        </Field>
        <StatefulButton
          type="button"
          disabled={!kanLede || !tilId || totpOverfor.length < 6 || overfor.isPending}
          state={overfor.isPending ? 'loading' : 'idle'}
          loadingText=""
          successText=""
          errorText="Prøv igjen"
          onClick={() => overfor.mutate({ tilUserId: tilId, totp: totpOverfor })}
        >
          Overfør daglig leder
        </StatefulButton>
        {overfor.isSuccess ? (
          <p className="text-body text-fg-muted">Overført. Logg inn på nytt.</p>
        ) : null}
        {overfor.error ? <p className="text-body text-danger">{overfor.error.message}</p> : null}
      </section>
    </div>
  );
}
