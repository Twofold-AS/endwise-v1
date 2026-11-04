'use client';

import { ListeRad } from '@endwise/ui';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';

export function VelgSkjema() {
  const bytt = trpc.kontekst.bytt.useMutation();
  const [error, setError] = useState<string | null>(null);

  async function velg(til: 'privat' | 'bedrift') {
    setError(null);
    try {
      const ut = await bytt.mutateAsync({ til });
      window.location.assign(ut.landing);
    } catch {
      if (til === 'bedrift') {
        window.location.assign('/2fa-oppsett');
        return;
      }
      setError('Kunne ikke bytte. Prøv igjen.');
    }
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
        undertekst="Verkstedet. Krever passnøkkel."
        onClick={() => void velg('bedrift')}
      />
      {error ? <p className="text-meta text-danger">{error}</p> : null}
    </div>
  );
}
