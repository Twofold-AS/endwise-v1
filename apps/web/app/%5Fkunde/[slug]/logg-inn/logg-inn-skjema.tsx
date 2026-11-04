'use client';

import {
  erMagicLinkKode,
  magicLinkVerifySti,
  normaliserMagicLinkKode,
} from '@endwise/auth/magic-link';
import { ArrowRight, FeltInput, FeltKode, StatefulButton } from '@endwise/ui';
import { type FormEvent, useState } from 'react';
import { signIn } from '@/lib/auth-client';

const FORTSETT = 'Fortsett';

export function LoggInnSkjema({ merke }: { merke: string }) {
  const [email, setEmail] = useState('');
  const [kode, setKode] = useState('');
  const [steg, setSteg] = useState<'epost' | 'kode'>('epost');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function onEpost(e: FormEvent) {
    e.preventDefault();
    setBusy('loading');
    setError(null);
    const res = await signIn.magicLink({
      email: email.trim(),
      callbackURL: '/velg',
    });
    if (res.error) {
      setError('Kunne ikke sende kode. Prøv igjen.');
      setBusy('error');
      return;
    }
    setBusy('idle');
    setSteg('kode');
  }

  function onKode(e: FormEvent) {
    e.preventDefault();
    const token = normaliserMagicLinkKode(kode);
    if (!erMagicLinkKode(token)) {
      setError('Skriv den 5-sifrede koden fra e-posten.');
      return;
    }
    setBusy('loading');
    window.location.assign(magicLinkVerifySti(token, '/velg'));
  }

  if (steg === 'kode') {
    return (
      <form onSubmit={onKode} className="flex flex-col gap-4" data-kunde-logg-inn-kode>
        <p className="text-center text-[15px] font-[450] leading-[22px] text-fg-muted">
          Vi har sendt en midlertidig kode til{' '}
          <span className="font-[650] text-fg">{email || 'e-posten din'}</span>.
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

  return (
    <form onSubmit={(e) => void onEpost(e)} className="flex flex-col gap-4" data-kunde-logg-inn>
      <FeltInput
        id="kunde-epost"
        storrelse="lg"
        type="email"
        autoComplete="email"
        isRequired
        label="E-post"
        value={email}
        onChange={setEmail}
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
    </form>
  );
}
