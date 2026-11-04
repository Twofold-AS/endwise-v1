'use client';

import { erMagicLinkKode, normaliserMagicLinkKode } from '@endwise/auth/magic-link';
import { ArrowRight, FeltInput, FeltKode, KeyRound, StatefulButton } from '@endwise/ui';
import { type FormEvent, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';

const FORTSETT = 'Fortsett';
const SAMME = 'Hvis kontoen finnes, får du en kode på e-post.';

function serUtSomEpost(v: string): boolean {
  return v.includes('@');
}

export function LoggInnSkjema({ merke }: { merke: string }) {
  const [ident, setIdent] = useState('');
  const [kode, setKode] = useState('');
  const [steg, setSteg] = useState<'ident' | 'kode'>('ident');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const beOmKode = trpc.kunde.beOmKode.useMutation();

  async function onIdent(e: FormEvent) {
    e.preventDefault();
    setBusy('loading');
    setError(null);
    const verdi = ident.trim();
    try {
      await beOmKode.mutateAsync(serUtSomEpost(verdi) ? { epost: verdi } : { telefon: verdi });
      setBusy('idle');
      setSteg('kode');
    } catch {
      setBusy('idle');
      setSteg('kode');
    }
  }

  async function onKode(e: FormEvent) {
    e.preventDefault();
    const token = normaliserMagicLinkKode(kode);
    if (!erMagicLinkKode(token)) {
      setError('Skriv den 5-sifrede koden fra e-posten.');
      return;
    }
    setBusy('loading');
    setError(null);
    try {
      const res = await authClient.magicLink.verify({
        query: { token, callbackURL: '/min-side' },
      });
      if (res.error) {
        setError(
          res.error.status === 429
            ? 'For mange forsøk. Vent ett minutt og prøv igjen.'
            : 'Kunne ikke logge inn. Prøv igjen, eller be om ny kode.',
        );
        setBusy('error');
        return;
      }
      window.location.assign('/min-side');
    } catch (err) {
      const status =
        err && typeof err === 'object' && 'status' in err
          ? Number((err as { status: unknown }).status)
          : 0;
      setError(
        status === 429
          ? 'For mange forsøk. Vent ett minutt og prøv igjen.'
          : 'Kunne ikke logge inn. Prøv igjen, eller be om ny kode.',
      );
      setBusy('error');
    }
  }

  if (steg === 'kode') {
    return (
      <form
        onSubmit={(e) => void onKode(e)}
        className="flex flex-col gap-4"
        data-kunde-logg-inn-kode
      >
        <p className="text-center text-[15px] font-[450] leading-[22px] text-fg-muted">{SAMME}</p>
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
          className="h-auto w-full py-5"
          loadingText=""
          successText=""
          errorText="Prøv igjen"
          icon={<ArrowRight size={16} />}
        >
          {FORTSETT}
        </StatefulButton>
      </form>
    );
  }

  async function onPasskey() {
    setError(null);
    setBusy('loading');
    try {
      const klient = authClient as typeof authClient & {
        signIn: typeof authClient.signIn & {
          passkey?: (opts?: { autoFill?: boolean }) => Promise<{ error?: unknown }>;
        };
      };
      const inn = await klient.signIn.passkey?.();
      if (inn?.error) {
        setError(null);
        setBusy('idle');
        return;
      }
      window.location.assign('/min-side');
    } catch {
      setBusy('idle');
    }
  }

  return (
    <form onSubmit={(e) => void onIdent(e)} className="flex flex-col gap-4" data-kunde-logg-inn>
      <FeltInput
        id="kunde-ident"
        storrelse="lg"
        type="text"
        autoComplete="username"
        isRequired
        label="E-post eller telefon"
        value={ident}
        onChange={setIdent}
        placeholder={`deg@${merke.toLowerCase().replace(/\s+/g, '')}.no`}
      />
      {error ? <p className="text-meta text-danger">{error}</p> : null}
      <StatefulButton
        type="submit"
        state={busy}
        className="h-auto w-full py-5"
        loadingText=""
        successText=""
        errorText="Prøv igjen"
        icon={<ArrowRight size={16} />}
      >
        {FORTSETT}
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
  );
}
