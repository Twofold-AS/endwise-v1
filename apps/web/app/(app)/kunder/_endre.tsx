'use client';

import { StatefulButton } from '@endwise/ui';
import { type FormEvent, type ReactNode, useState } from 'react';
import { trpc } from '@/lib/trpc';

export const ADRESSE_PREFIKS = '[ADRESSE] ';

export function sisteAdresse(notater: readonly { body: string }[]): string {
  const treff = notater.find((n) => n.body.startsWith(ADRESSE_PREFIKS));
  return treff ? treff.body.slice(ADRESSE_PREFIKS.length).trim() : '';
}

type RadNokkel = 'telefon' | 'epost' | 'adresse' | 'navn' | null;

/**
 * Kundeoversikt — Endre-rader som Innstillinger › Konto.
 * Telefon og e-post skrives på kunden. Adresse logges som intern endring
 * (ingen egen kolonne — vises fra siste `[ADRESSE] `-notat).
 */
export function KundeEndre({
  id,
  navn,
  telefon,
  epost,
  adresse,
}: {
  id: string;
  navn: string;
  telefon: string | null;
  epost: string | null;
  adresse: string;
}) {
  const utils = trpc.useUtils();
  const [apen, setApen] = useState<RadNokkel>(null);

  const oppdater = trpc.customers.update.useMutation({
    onSuccess: () => {
      void utils.customers.byId.invalidate({ id });
      void utils.customers.list.invalidate();
      setApen(null);
    },
  });
  const notat = trpc.customers.addNote.useMutation({
    onSuccess: () => {
      void utils.customers.byId.invalidate({ id });
      setApen(null);
    },
  });

  return (
    <section data-kunde-endre className="flex flex-col">
      <h2 className="text-title text-fg">Kontakt og adresse</h2>
      <KundeRad
        label="Navn"
        verdi={navn || '—'}
        apen={apen === 'navn'}
        onEndre={() => setApen(apen === 'navn' ? null : 'navn')}
      >
        <TekstLagre
          start={navn}
          label="Navn"
          max={160}
          pending={oppdater.isPending}
          feil={oppdater.error?.message}
          onLagre={(v) => oppdater.mutate({ id, name: v })}
        />
      </KundeRad>
      <KundeRad
        label="Telefonnummer"
        verdi={telefon || '—'}
        apen={apen === 'telefon'}
        onEndre={() => setApen(apen === 'telefon' ? null : 'telefon')}
      >
        <TekstLagre
          start={telefon ?? ''}
          label="Telefon"
          max={32}
          pending={oppdater.isPending}
          feil={oppdater.error?.message}
          onLagre={(v) => oppdater.mutate({ id, phone: v || null })}
        />
      </KundeRad>
      <KundeRad
        label="E-post"
        verdi={epost || '—'}
        apen={apen === 'epost'}
        onEndre={() => setApen(apen === 'epost' ? null : 'epost')}
      >
        <TekstLagre
          start={epost ?? ''}
          label="E-post"
          type="email"
          max={160}
          pending={oppdater.isPending}
          feil={oppdater.error?.message}
          onLagre={(v) => oppdater.mutate({ id, email: v || null })}
        />
      </KundeRad>
      <KundeRad
        label="Adresse"
        verdi={adresse || '—'}
        apen={apen === 'adresse'}
        onEndre={() => setApen(apen === 'adresse' ? null : 'adresse')}
        siste
      >
        <TekstLagre
          start={adresse}
          label="Adresse"
          max={200}
          pending={notat.isPending}
          feil={notat.error?.message}
          onLagre={(v) => {
            const neste = v.trim();
            if (!neste || neste === adresse) return;
            notat.mutate({ customerId: id, body: `${ADRESSE_PREFIKS}${neste}` });
          }}
        />
      </KundeRad>
    </section>
  );
}

function KundeRad({
  label,
  verdi,
  apen,
  onEndre,
  siste,
  children,
}: {
  label: string;
  verdi: string;
  apen: boolean;
  onEndre: () => void;
  siste?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={siste ? '' : 'border-border border-b'} data-kunde-rad={label}>
      <div className="flex items-start justify-between gap-3 py-4">
        <div className="min-w-0 flex-1">
          <p className="text-label text-fg">{label}</p>
          <p className="mt-1 truncate text-[13px] text-fg-muted">{verdi}</p>
        </div>
        <button
          type="button"
          data-kunde-endre={label}
          onClick={onEndre}
          className="shrink-0 pt-0.5 text-label font-[650] text-fg"
        >
          {apen ? 'Lukk' : 'Endre'}
        </button>
      </div>
      {apen ? <div className="pb-5">{children}</div> : null}
    </div>
  );
}

function TekstLagre({
  start,
  label,
  max,
  type = 'text',
  pending,
  feil,
  onLagre,
}: {
  start: string;
  label: string;
  max: number;
  type?: 'text' | 'email';
  pending: boolean;
  feil?: string;
  onLagre: (v: string) => void;
}) {
  const [verdi, setVerdi] = useState(start);

  function submit(e: FormEvent) {
    e.preventDefault();
    onLagre(verdi.trim());
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label className="flex flex-col gap-1.5">
        <span className="sr-only">{label}</span>
        <input
          type={type}
          value={verdi}
          onChange={(e) => setVerdi(e.target.value)}
          maxLength={max}
          className="h-control ew-felt ew-felt-md px-2.5"
        />
      </label>
      {feil ? <p className="text-[13px] text-danger">{feil}</p> : null}
      <div className="flex justify-end">
        <StatefulButton
          type="submit"
          disabled={pending}
          state={pending ? 'loading' : feil ? 'error' : 'idle'}
          loadingText="Lagrer…"
          errorText="Feilet"
        >
          Lagre
        </StatefulButton>
      </div>
    </form>
  );
}
