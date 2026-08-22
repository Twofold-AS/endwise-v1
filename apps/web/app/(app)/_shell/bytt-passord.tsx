'use client';

import { byttPassordKall, validerByttPassord } from '@endwise/auth/bytt-passord';
import { KeyRound, StatefulButton } from '@endwise/ui';
import { type FormEvent, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { PassordFelt } from '../../_auth/felter';
import { CardShell } from './cards';

/**
 * F1-17 — bytt passord med gjeldende som bevis.
 *
 * ⚠️ Én komponent, to steder: Settings › Profil og mekanikerens «Meg», via
 * `ProfilKort`. To kopier ville fått hver sin validering.
 *
 * Better-Auth `changePassword` krever gjeldende passord. `revokeOtherSessions`
 * er låst til true i `byttPassordKall` — default false ville latt en stjålet
 * sesjon overleve byttet.
 */
export function ByttPassordSkjema() {
  const [gjeldende, setGjeldende] = useState('');
  const [nytt, setNytt] = useState('');
  const [bekreft, setBekreft] = useState('');
  const [feil, setFeil] = useState<string | null>(null);
  const [busy, setBusy] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFeil(null);

    const sjekk = validerByttPassord({ gjeldende, nytt, bekreft });
    if (!sjekk.ok) {
      setFeil(sjekk.feil);
      setBusy('error');
      return;
    }

    setBusy('loading');
    const res = await authClient.changePassword(byttPassordKall(sjekk));
    if (res.error) {
      setBusy('error');
      setFeil(feilmelding(res.error));
      return;
    }

    setBusy('success');
    setGjeldende('');
    setNytt('');
    setBekreft('');
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-label text-fg">Passord</h2>
      <CardShell className="p-4">
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <PassordFelt
            id="bytt-gjeldende"
            label="Gjeldende passord"
            value={gjeldende}
            onChange={setGjeldende}
            autoComplete="current-password"
          />
          <PassordFelt
            id="bytt-nytt"
            label="Nytt passord"
            value={nytt}
            onChange={setNytt}
            autoComplete="new-password"
            beskrivelse="Minst 12 tegn. Du blir logget ut på andre enheter."
          />
          <PassordFelt
            id="bytt-bekreft"
            label="Bekreft nytt passord"
            value={bekreft}
            onChange={setBekreft}
            autoComplete="new-password"
          />
          {feil && <p className="text-[12px] text-danger">{feil}</p>}
          <StatefulButton
            type="submit"
            state={busy}
            className="self-start"
            loadingText="Bytter …"
            successText="Byttet"
            errorText="Prøv igjen"
            icon={<KeyRound size={15} />}
          >
            Bytt passord
          </StatefulButton>
        </form>
        <p className="mt-3 text-[12px] text-fg-muted">
          Husker du ikke det gamle?{' '}
          <a href="/glemt-passord" className="underline underline-offset-2 hover:text-fg">
            Bytt med e-postlenke
          </a>
          .
        </p>
      </CardShell>
    </section>
  );
}

function feilmelding(error: { status?: number; code?: string; message?: string }): string {
  if (error.code === 'INVALID_PASSWORD') {
    return 'Feil gjeldende passord.';
  }
  return error.message ?? 'Kunne ikke bytte passordet.';
}
