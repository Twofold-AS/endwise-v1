'use client';

import { erMagicLinkKode, normaliserMagicLinkKode } from '@endwise/auth/magic-link';
import {
  KUNDE_KODE_FEIL,
  KUNDE_KODE_SENDT,
  kundeKodeFeilMelding,
} from '@endwise/modules/kunde/logg-inn-kode';
import { ArrowRight, FeilFlate, FeltInput, FeltKode, KeyRound, StatefulButton } from '@endwise/ui';
import { type FormEvent, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';

const FORTSETT = 'Fortsett';

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
    const kanal = serUtSomEpost(verdi) ? 'epost' : 'telefon';
    try {
      const svar = await beOmKode.mutateAsync(
        kanal === 'epost' ? { epost: verdi } : { telefon: verdi },
      );
      if (svar.sendt) {
        setBusy('idle');
        setSteg('kode');
        return;
      }
      setError(kundeKodeFeilMelding(svar.grunn, merke, kanal));
      setBusy(svar.grunn === 'ukjent-kunde' ? 'idle' : 'error');
    } catch {
      setBusy('error');
      setError(KUNDE_KODE_FEIL);
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
        <p className="text-center text-[15px] font-[450] leading-[22px] text-fg-muted">
          {KUNDE_KODE_SENDT}
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
        isInvalid={Boolean(error)}
        label="E-post eller telefon"
        value={ident}
        onChange={(v) => {
          setIdent(v);
          if (error) setError(null);
        }}
        placeholder={`deg@${merke.toLowerCase().replace(/\s+/g, '')}.no`}
      />
      {error ? (
        <div data-kunde-logg-inn-ukjent>
          <FeilFlate melding={error} className="py-1" />
        </div>
      ) : null}
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
