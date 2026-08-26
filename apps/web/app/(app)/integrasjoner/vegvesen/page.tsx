'use client';

import { Input, Lock, ShieldCheck, StatefulButton } from '@endwise/ui';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useOrgRole } from '../../_lib/use-org-role';
import { CardShell } from '../../_shell/cards';

/**
 * Vegvesen-API-nøkkel. Serveren lagrer den envelope-kryptert.
 * Klienten ser bare `hasKey`. Nøkkelen logges ikke og bundler ikke.
 */
export default function VegvesenPage() {
  const { isAdmin, isLoading: roleLoading } = useOrgRole();
  const utils = trpc.useUtils();
  const config = trpc.vegvesen.config.useQuery();
  const [nokkel, setNokkel] = useState('');
  const [feil, setFeil] = useState<string | null>(null);
  const [busy, setBusy] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const hasKey = config.data?.hasKey ?? false;
  const lagre = trpc.vegvesen.setKey.useMutation({
    onSuccess: () => {
      setNokkel('');
      setFeil(null);
      setBusy('success');
      void utils.vegvesen.config.invalidate();
    },
    onError: (error) => {
      setBusy('error');
      setFeil(error.message);
    },
  });

  const kanLagre = isAdmin && nokkel.trim().length >= 8;

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="text-title text-fg">Statens vegvesen</h1>
        <p className="text-body text-fg-muted">
          API-nøkkel for Autosys-oppslag (regnr → merke, modell, EU-frist). Nøkkelen lagres kryptert
          på serveren og vises aldri tilbake.
        </p>
      </div>

      {!roleLoading && !isAdmin && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-fg-muted text-xs">
          <Lock size={13} /> Kun forhandler-admin kan endre nøkkelen.
        </div>
      )}

      {config.isError ? (
        <CardShell className="p-5">
          <p className="text-body text-danger">{config.error.message}</p>
        </CardShell>
      ) : null}

      <CardShell>
        <div className="flex flex-1 flex-col gap-4 rounded-lg bg-inset p-5">
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-[13px] text-fg">API-nøkkel</span>
            <p className="text-[12px] text-fg-faint leading-snug">
              Hentes hos Statens vegvesen (Autosys Enkeltoppslag). Hvert oppslag koster — nøkkelen
              er per forhandler.
              {hasKey ? ' En nøkkel er allerede lagret.' : ''}
            </p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] text-fg-muted">
              Nøkkel {hasKey && <span className="text-fg-faint">· lagret (kryptert)</span>}
            </span>
            <Input
              type="password"
              value={nokkel}
              onChange={(e) => setNokkel(e.target.value)}
              disabled={!isAdmin}
              placeholder={hasKey ? '•••••••• (lim inn for å bytte)' : 'Lim inn API-nøkkel'}
              spellCheck={false}
              autoComplete="off"
            />
          </label>

          {feil && <p className="text-[12px] text-danger">{feil}</p>}

          <StatefulButton
            type="button"
            state={busy}
            className="self-start"
            disabled={!kanLagre}
            loadingText="Lagrer …"
            successText="Lagret"
            errorText="Prøv igjen"
            icon={<ShieldCheck size={15} />}
            onClick={() => {
              setFeil(null);
              setBusy('loading');
              lagre.mutate({ nokkel: nokkel.trim() });
            }}
          >
            Lagre nøkkel
          </StatefulButton>
        </div>
      </CardShell>
    </div>
  );
}
