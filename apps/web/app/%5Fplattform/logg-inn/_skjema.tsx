'use client';

import { erMagicLinkKode, normaliserMagicLinkKode } from '@endwise/auth/magic-link';
import { ArrowRight, FeltInput, FeltKode, KeyRound, StatefulButton } from '@endwise/ui';
import { type FormEvent, useRef, useState } from 'react';
import { authClient, signIn } from '@/lib/auth-client';
import { AuthMerke } from '../../_auth/merke';

const FEIL = 'Kunne ikke logge inn.';
const AUTH_FLATE = 'flex flex-col gap-4';
const AUTH_KNAPP = 'h-auto w-full py-5';

type Steg = 'epost' | 'kode' | 'nokkel';

export function PlattformLoggInnSkjema({ startSteg }: { startSteg: Steg }) {
  const [steg, setSteg] = useState<Steg>(startSteg);
  const [email, setEmail] = useState('');
  const [kode, setKode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const kodeRef = useRef<HTMLDivElement>(null);

  async function onEpost(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy('loading');
    const res = await signIn.magicLink({
      email: email.trim(),
      callbackURL: '/endwise',
    });
    setBusy('idle');
    if (res.error) {
      setError(FEIL);
      return;
    }
    setSteg('kode');
  }

  async function onKode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const norm = normaliserMagicLinkKode(kode);
    if (!erMagicLinkKode(norm)) {
      setError(FEIL);
      return;
    }
    setBusy('loading');
    try {
      const res = await authClient.magicLink.verify({
        query: { token: norm, callbackURL: '/endwise' },
      });
      if (res.error) {
        setBusy('idle');
        setError(
          res.error.status === 429 ? 'For mange forsøk. Vent ett minutt og prøv igjen.' : FEIL,
        );
        kodeRef.current?.focus();
        return;
      }
      setBusy('idle');
      setSteg('nokkel');
    } catch (err) {
      const status =
        err && typeof err === 'object' && 'status' in err
          ? Number((err as { status: unknown }).status)
          : 0;
      setBusy('idle');
      setError(status === 429 ? 'For mange forsøk. Vent ett minutt og prøv igjen.' : FEIL);
      kodeRef.current?.focus();
    }
  }

  async function onPasskey() {
    setError(null);
    setBusy('loading');
    try {
      const klient = authClient as typeof authClient & {
        signIn: typeof authClient.signIn & {
          passkey?: (opts?: { autoFill?: boolean }) => Promise<{ error?: unknown }>;
        };
        passkey?: {
          addPasskey?: () => Promise<{ error?: unknown }>;
        };
      };
      const inn = await klient.signIn.passkey?.();
      if (!inn?.error) {
        window.location.assign('/endwise');
        return;
      }
      const add = await klient.passkey?.addPasskey?.();
      if (!add?.error) {
        window.location.assign('/endwise');
        return;
      }
      setError(FEIL);
    } catch {
      setError(FEIL);
    }
    setBusy('idle');
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4 pb-[14vh] text-fg">
      <div className="w-full max-w-sm">
        <div className="mt-8 mb-6 flex flex-col items-center gap-3">
          <AuthMerke />
          <p className="text-label font-[650] uppercase tracking-[0.08em] text-fg-muted">Admin</p>
        </div>

        {steg === 'epost' ? (
          <form onSubmit={(e) => void onEpost(e)} className={AUTH_FLATE}>
            <FeltInput
              id="platform-email"
              storrelse="lg"
              type="email"
              autoComplete="username webauthn"
              isRequired
              label="E-post"
              value={email}
              onChange={setEmail}
            />
            {error && <p className="text-meta text-danger">{error}</p>}
            <StatefulButton
              type="submit"
              state={busy}
              className={AUTH_KNAPP}
              loadingText=""
              successText=""
              errorText="Prøv igjen"
              icon={<ArrowRight size={16} />}
            >
              Fortsett
            </StatefulButton>
            <button
              type="button"
              onClick={() => void onPasskey()}
              className="inline-flex h-12 items-center justify-center gap-2 text-[15px] font-[650] text-fg underline underline-offset-2"
            >
              <KeyRound size={16} />
              Bruk nøkkel
            </button>
          </form>
        ) : steg === 'kode' ? (
          <form onSubmit={(e) => void onKode(e)} className={AUTH_FLATE}>
            <p className="text-center text-[15px] font-[450] leading-[22px] text-fg-muted">
              Skriv koden vi sendte til e-posten din.
            </p>
            <FeltKode
              ref={kodeRef}
              aria-label="Kode"
              length={5}
              value={kode}
              onChange={(v) => setKode(normaliserMagicLinkKode(v))}
              isInvalid={Boolean(error)}
            />
            {error && <p className="text-meta text-danger">{error}</p>}
            <StatefulButton
              type="submit"
              state={busy}
              className={AUTH_KNAPP}
              loadingText=""
              successText=""
              errorText="Prøv igjen"
              icon={<ArrowRight size={16} />}
            >
              Fortsett
            </StatefulButton>
          </form>
        ) : (
          <div className={AUTH_FLATE}>
            <p className="text-center text-[15px] font-[450] leading-[22px] text-fg-muted">
              Bekreft med nøkkelen din. Første gang: registrer nøkkelen på denne enheten.
            </p>
            {error && <p className="text-meta text-danger">{error}</p>}
            <StatefulButton
              type="button"
              state={busy}
              className={AUTH_KNAPP}
              loadingText=""
              successText=""
              errorText="Prøv igjen"
              icon={<KeyRound size={16} />}
              onClick={() => void onPasskey()}
            >
              Bruk nøkkel
            </StatefulButton>
          </div>
        )}
      </div>
    </main>
  );
}
