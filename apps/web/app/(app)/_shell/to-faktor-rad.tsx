'use client';

import { TO_FAKTOR_OPPSETT_STI, toFaktorStatusTekst } from '@endwise/auth/to-faktor-oppsett';
import { ShieldCheck, StatefulButton } from '@endwise/ui';
import { type FormEvent, useState } from 'react';
import { authClient } from '@/lib/auth-client';

/**
 * 2FA-statusrad. Slå-av uten passord — sesjonen er allerede TOTP-bevist.
 */
export function ToFaktorRad({ enabled }: { enabled: boolean | undefined }) {
  const pa = enabled === true;
  const [feil, setFeil] = useState<string | null>(null);
  const [busy, setBusy] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function slaAv(event: FormEvent) {
    event.preventDefault();
    setFeil(null);
    setBusy('loading');
    const res = await authClient.twoFactor.disable({});
    if (res.error) {
      setBusy('error');
      setFeil(res.error.message ?? 'Kunne ikke slå av tofaktor.');
      return;
    }
    setBusy('success');
  }

  return (
    <div className="flex flex-col">
      <div className="flex h-row-store items-center gap-3 bg-bg px-4">
        <ShieldCheck size={16} className="shrink-0 text-fg-muted" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-label text-fg">To-faktor</span>
          <span className="text-[12px] text-fg-muted">{toFaktorStatusTekst(enabled)}</span>
        </div>
        {pa ? null : (
          <a
            href={TO_FAKTOR_OPPSETT_STI}
            className="inline-flex h-control shrink-0 items-center rounded-control border border-border px-3 text-fg text-label transition-colors hover:bg-surface-2"
          >
            Sett opp
          </a>
        )}
      </div>
      {pa ? (
        <form
          onSubmit={slaAv}
          className="flex flex-col gap-3 border-border border-t bg-inset px-4 py-3"
        >
          {feil && <p className="text-[12px] text-danger">{feil}</p>}
          <StatefulButton
            type="submit"
            state={busy}
            className="self-start"
            loadingText="Slår av …"
            successText="Slått av"
            errorText="Prøv igjen"
            icon={<ShieldCheck size={15} />}
          >
            Slå av tofaktor
          </StatefulButton>
        </form>
      ) : null}
    </div>
  );
}
