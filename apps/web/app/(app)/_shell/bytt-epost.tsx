'use client';

import {
  BYTT_EPOST_GENERISK_MELDING,
  byttEpostKall,
  validerByttEpost,
} from '@endwise/auth/bytt-epost';
import { Mail, StatefulButton } from '@endwise/ui';
import { type FormEvent, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { Field, INPUT } from '../../_auth/felter';
import { CardShell } from './cards';

/**
 * Be om e-postbytte. Adressen byttes ikke her.
 * Serveren krever innlogget sesjon med TOTP på. Bekreftelse går til
 * adressen brukeren har. Først når lenka åpnes — og den nye adressen
 * bekreftes — skrives e-posten.
 */
export function ByttEpostSkjema({ gjeldende }: { gjeldende: string }) {
  const [nyEpost, setNyEpost] = useState('');
  const [bekreft, setBekreft] = useState('');
  const [totp, setTotp] = useState('');
  const [feil, setFeil] = useState<string | null>(null);
  const [sendt, setSendt] = useState(false);
  const [busy, setBusy] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFeil(null);
    setSendt(false);

    const sjekk = validerByttEpost({ nyEpost, bekreft });
    if (!sjekk.ok) {
      setFeil(sjekk.feil);
      setBusy('error');
      return;
    }
    if (sjekk.nyEpost === gjeldende.trim().toLowerCase()) {
      setFeil('Den nye adressen må være forskjellig fra den du har nå.');
      setBusy('error');
      return;
    }

    setBusy('loading');
    /**
     * `password` er for serverhooken (F1-22). Better-Auths skjema kjenner
     * bare `newEmail` + `callbackURL` — feltet strippes i handleren, ikke
     * i `hooks.before`. `as never` er typen, ikke en snarvei rundt sjekken.
     */
    const res = await authClient.changeEmail(byttEpostKall(sjekk, totp.trim()) as never);
    if (res.error) {
      setBusy('error');
      setFeil(BYTT_EPOST_GENERISK_MELDING);
      return;
    }

    setBusy('success');
    setSendt(true);
    setNyEpost('');
    setBekreft('');
    setTotp('');
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-label text-fg">Bytt e-post</h2>
      <CardShell className="p-4">
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <Field id="bytt-epost-ny" label="Ny e-post">
            <input
              id="bytt-epost-ny"
              type="email"
              autoComplete="email"
              value={nyEpost}
              onChange={(e) => setNyEpost(e.target.value)}
              className={`w-full ${INPUT}`}
            />
          </Field>
          <Field id="bytt-epost-bekreft" label="Bekreft ny e-post">
            <input
              id="bytt-epost-bekreft"
              type="email"
              autoComplete="email"
              value={bekreft}
              onChange={(e) => setBekreft(e.target.value)}
              className={`w-full ${INPUT}`}
            />
          </Field>
          <Field id="bytt-epost-totp" label="App-kode">
            <input
              id="bytt-epost-totp"
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              value={totp}
              onChange={(e) => setTotp(e.target.value.replace(/\D/g, ''))}
              className={`w-full ${INPUT} font-mono tracking-[0.4em]`}
              placeholder="••••••"
            />
          </Field>
          {feil && <p className="text-[12px] text-danger">{feil}</p>}
          {sendt && (
            <p className="text-[12px] text-fg-muted">
              Vi har sendt en bekreftelse til adressen du har nå. E-posten byttes først når du åpner
              lenken — og deretter bekrefter den nye adressen.
            </p>
          )}
          <StatefulButton
            type="submit"
            state={busy}
            className="self-start"
            loadingText="Sender …"
            successText="Sendt"
            errorText="Prøv igjen"
            icon={<Mail size={15} />}
          >
            Send bekreftelse
          </StatefulButton>
        </form>
      </CardShell>
    </section>
  );
}
