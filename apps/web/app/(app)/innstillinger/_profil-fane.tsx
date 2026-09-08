'use client';

import { Avatar, StatefulButton } from '@endwise/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import { authClient, useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { ByttEpostSkjema } from '../_shell/bytt-epost';
import { VisningsnavnFelt } from '../_shell/profil-kort';
import { ToFaktorRad } from '../_shell/to-faktor-rad';

type RadNokkel = 'navn' | 'epost' | 'passord' | 'autentikator' | null;

/**
 * F5-19 — Settings › Konto (Mikael 08.09).
 * Avatar står stille med farge. Personlige detaljer som rader med Endre.
 * Ingen filopplasting. Ingen fargevelger.
 */
export function ProfilFane() {
  const me = trpc.session.me.useQuery();
  const meg = trpc.profile.meg.useQuery();
  const { data: session } = useSession();
  const [apen, setApen] = useState<RadNokkel>(null);
  const twoFactorEnabled =
    session?.user && 'twoFactorEnabled' in session.user
      ? (session.user as { twoFactorEnabled?: boolean }).twoFactorEnabled
      : undefined;

  const navn = meg.data?.navn ?? me.data?.navn ?? '';
  const epost = meg.data?.epost ?? me.data?.epost ?? '';

  return (
    <div data-konto-fane className="flex flex-col">
      {me.data?.userId ? (
        <div className="flex flex-col items-center gap-3 pt-2 pb-8">
          <Avatar
            seed={me.data.userId}
            valg={meg.data?.avatar}
            navn={navn}
            size={88}
            bevegelse="stille"
          />
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-[28px] font-[650] leading-tight text-fg">{navn || '—'}</p>
            <p className="text-[15px] text-fg-muted">{epost || '—'}</p>
          </div>
        </div>
      ) : null}

      <section className="flex flex-col gap-8">
        <h2 className="text-title text-fg">Personlige detaljer</h2>
        <div className="flex flex-col">
          <KontoRad
            label="Navn"
            verdi={navn || '—'}
            apen={apen === 'navn'}
            onEndre={() => setApen(apen === 'navn' ? null : 'navn')}
          >
            <VisningsnavnFelt />
          </KontoRad>
          <KontoRad
            label="E-post"
            verdi={epost || '—'}
            apen={apen === 'epost'}
            onEndre={() => setApen(apen === 'epost' ? null : 'epost')}
          >
            <ByttEpostSkjema gjeldende={epost} />
          </KontoRad>
          <KontoRad
            label="Passord"
            verdi="Magic link — ingen passord"
            apen={apen === 'passord'}
            onEndre={() => setApen(apen === 'passord' ? null : 'passord')}
          >
            <p className="text-[13px] text-fg-muted leading-relaxed">
              Du logger inn med e-postkode. Passord brukes ikke på Endwise-kontoen.
            </p>
          </KontoRad>
          <KontoRad
            label="Autentikator"
            verdi={
              twoFactorEnabled === true ? 'På' : twoFactorEnabled === false ? 'Ikke satt opp' : '—'
            }
            apen={apen === 'autentikator'}
            onEndre={() => setApen(apen === 'autentikator' ? null : 'autentikator')}
            siste
          >
            <ToFaktorRad enabled={twoFactorEnabled} />
          </KontoRad>
        </div>
      </section>

      <section className="mt-12 flex flex-col gap-8">
        <h2 className="text-title text-fg">Administrer konto</h2>
        <AdministrerKonto />
      </section>
    </div>
  );
}

function KontoRad({
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
    <div className={siste ? '' : 'border-border border-b'} data-konto-rad={label}>
      <div className="flex items-start justify-between gap-3 py-4">
        <div className="min-w-0 flex-1">
          <p className="text-label text-fg">{label}</p>
          <p className="mt-1 truncate text-[13px] text-fg-muted">{verdi}</p>
        </div>
        <button
          type="button"
          data-konto-endre={label}
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

function AdministrerKonto() {
  const router = useRouter();
  const [overalt, setOveralt] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [slett, setSlett] = useState<'idle' | 'bekreft' | 'loading' | 'error'>('idle');
  const [feil, setFeil] = useState<string | null>(null);

  async function loggUtOveralt() {
    setFeil(null);
    setOveralt('loading');
    try {
      await authClient.revokeOtherSessions();
      setOveralt('success');
    } catch {
      setOveralt('error');
      setFeil('Kunne ikke logge ut overalt. Prøv igjen.');
    }
  }

  async function slettKonto() {
    setFeil(null);
    setSlett('loading');
    try {
      const slettFn = (
        authClient as { deleteUser?: (i: { callbackURL: string }) => Promise<{ error?: unknown }> }
      ).deleteUser;
      if (!slettFn) {
        setSlett('error');
        setFeil(
          'Sletting av konto er ikke selvbetjent ennå. Kontakt Endwise for å slette konto og innhold.',
        );
        return;
      }
      const res = await slettFn({ callbackURL: '/signin' });
      if (res.error) {
        setSlett('error');
        setFeil(
          'Sletting av konto er ikke selvbetjent ennå. Kontakt Endwise for å slette konto og innhold.',
        );
        return;
      }
      await authClient.signOut().catch(() => undefined);
      router.replace('/signin' as Route);
    } catch {
      setSlett('error');
      setFeil(
        'Sletting av konto er ikke selvbetjent ennå. Kontakt Endwise for å slette konto og innhold.',
      );
    }
  }

  return (
    <div className="flex flex-col">
      <div className="border-border border-b py-4" data-konto-rad="Logg ut overalt">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-label text-fg">Logg ut overalt</p>
            <p className="mt-1 text-[13px] text-fg-muted">Du vil bli logget ut på alle enheter</p>
          </div>
          <StatefulButton
            type="button"
            state={overalt}
            loadingText="Logger ut …"
            successText="Logget ut"
            errorText="Feilet"
            onClick={() => void loggUtOveralt()}
          >
            Logg ut
          </StatefulButton>
        </div>
      </div>
      <div className="py-4" data-konto-rad="Slett konto">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-label text-fg">Slett konto og innhold</p>
            <p className="mt-1 text-[13px] text-fg-muted">Slett hele kontoen din fra Endwise</p>
          </div>
          {slett === 'bekreft' ? (
            <button
              type="button"
              data-konto-slett
              onClick={() => void slettKonto()}
              className="inline-flex h-control shrink-0 items-center rounded-control bg-danger px-3 text-label font-[650] text-white"
            >
              Bekreft slett
            </button>
          ) : (
            <button
              type="button"
              data-konto-slett
              onClick={() => setSlett('bekreft')}
              className="inline-flex h-control shrink-0 items-center rounded-control bg-danger px-3 text-label font-[650] text-white"
            >
              {slett === 'loading' ? 'Sletter …' : 'Slett'}
            </button>
          )}
        </div>
        {feil ? <p className="mt-3 text-[13px] text-danger">{feil}</p> : null}
      </div>
    </div>
  );
}
