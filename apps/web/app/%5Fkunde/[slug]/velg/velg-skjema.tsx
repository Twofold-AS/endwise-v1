'use client';

import { FeltKode, ListeRad, StatefulButton } from '@endwise/ui';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';

export function VelgSkjema() {
  const bytt = trpc.kontekst.bytt.useMutation();
  const [bedrift, setBedrift] = useState(false);
  const [totp, setTotp] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function velg(til: 'privat' | 'bedrift') {
    setError(null);
    try {
      const ut = await bytt.mutateAsync(til === 'bedrift' ? { til, totp } : { til });
      window.location.assign(ut.landing);
    } catch {
      setError(
        til === 'bedrift'
          ? 'Bedrift krever en fersk kode fra autentikator-appen.'
          : 'Kunne ikke bytte. Prøv igjen.',
      );
    }
  }

  if (bedrift) {
    return (
      <div className="flex flex-col gap-4" data-kunde-velg-bedrift>
        <p className="text-center text-title font-[650] text-fg">Nesten der</p>
        <p className="text-center text-body text-fg-muted">
          Skriv den 6-sifrede koden fra autentikator-appen.
        </p>
        <FeltKode
          aria-label="App-kode"
          length={6}
          value={totp}
          onChange={setTotp}
          isInvalid={Boolean(error)}
        />
        {error ? <p className="text-meta text-danger">{error}</p> : null}
        <StatefulButton
          type="button"
          state={bytt.isPending ? 'loading' : 'idle'}
          className="h-auto w-full py-5"
          loadingText=""
          successText=""
          errorText="Prøv igjen"
          onClick={() => void velg('bedrift')}
        >
          Åpne Bedrift
        </StatefulButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3" data-kunde-velg>
      <ListeRad
        tittel="Privat"
        undertekst="Bookinger, kjøretøy og profil"
        onClick={() => void velg('privat')}
      />
      <ListeRad
        tittel="Bedrift"
        undertekst="Verkstedet. Krever tofaktor."
        onClick={() => setBedrift(true)}
      />
      {error ? <p className="text-meta text-danger">{error}</p> : null}
    </div>
  );
}
