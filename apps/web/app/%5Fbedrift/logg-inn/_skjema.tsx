'use client';

import { erMagicLinkKode, normaliserMagicLinkKode } from '@endwise/auth/magic-link';
import { ArrowRight, FeltInput, FeltKode, StatefulButton } from '@endwise/ui';
import { type FormEvent, useState } from 'react';
import { authClient, signIn } from '@/lib/auth-client';
import { AuthMerke } from '../../_auth/merke';

const FEIL = 'Kunne ikke logge inn.';
const AUTH_FLATE = 'flex flex-col gap-4';
const AUTH_KNAPP = 'h-auto w-full py-5';

export function BedriftLoggInnSkjema() {
  const [steg, setSteg] = useState<'epost' | 'kode'>('epost');
  const [email, setEmail] = useState('');
  const [kode, setKode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function onEpost(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy('loading');
    const res = await signIn.magicLink({
      email: email.trim(),
      callbackURL: '/home',
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
        query: { token: norm, callbackURL: '/home' },
      });
      if (res.error) {
        setBusy('idle');
        setError(
          res.error.status === 429 ? 'For mange forsøk. Vent ett minutt og prøv igjen.' : FEIL,
        );
        return;
      }
      window.location.assign('/home');
    } catch (err) {
      const status =
        err && typeof err === 'object' && 'status' in err
          ? Number((err as { status: unknown }).status)
          : 0;
      setBusy('idle');
      setError(status === 429 ? 'For mange forsøk. Vent ett minutt og prøv igjen.' : FEIL);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 pb-[14vh] text-fg">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <AuthMerke />
        <h1 className="text-center text-[32px] font-[650] leading-10 tracking-[-0.4px]">
          Logg inn på Endwise
        </h1>
        {steg === 'epost' ? (
          <form onSubmit={(e) => void onEpost(e)} className={AUTH_FLATE} data-bedrift-logg-inn>
            <FeltInput
              id="bedrift-epost"
              storrelse="lg"
              type="email"
              autoComplete="email"
              isRequired
              label="E-post"
              value={email}
              onChange={setEmail}
            />
            {error ? <p className="text-meta text-danger">{error}</p> : null}
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
          <form onSubmit={(e) => void onKode(e)} className={AUTH_FLATE} data-bedrift-logg-inn-kode>
            <p className="text-center text-[15px] font-[450] leading-[22px] text-fg-muted">
              Hvis vi kjenner e-posten, har du fått en kode.
            </p>
            <FeltKode
              aria-label="Fyll inn kode"
              length={5}
              value={kode}
              onChange={(v) => setKode(normaliserMagicLinkKode(v))}
              isInvalid={Boolean(error)}
            />
            {error ? <p className="text-meta text-danger">{error}</p> : null}
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
        )}
      </div>
    </main>
  );
}
