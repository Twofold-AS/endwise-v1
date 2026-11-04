'use client';

import { MAGIC_LINK_ENROLL_UTEN_SESJON } from '@endwise/auth/magic-link';
import { fortsettEtter2faKvittering } from '@endwise/auth/to-faktor-oppsett';
import { KeyRound, StatefulButton } from '@endwise/ui';
import type { Route } from 'next';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient, useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { SIGNIN_STI } from '../signin/signin-steg';

/**
 * Tvungen passnøkkel for bedrift. Sesjonen beholdes — ingen utlogging.
 * TOTP og autentikator-app er fjernet.
 */
export default function PassnokkelOppsettPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: session, isPending: sesjonLaster } = useSession();
  const [feil, setFeil] = useState<string | null>(null);
  const [busy, setBusy] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [ferdig, setFerdig] = useState(false);

  async function registrer() {
    if (sesjonLaster) return;
    if (!session?.user) {
      setFeil(MAGIC_LINK_ENROLL_UTEN_SESJON);
      setBusy('error');
      return;
    }
    setFeil(null);
    setBusy('loading');
    try {
      const klient = authClient as typeof authClient & {
        passkey?: { addPasskey?: () => Promise<{ error?: unknown }> };
      };
      const add = await klient.passkey?.addPasskey?.();
      if (add?.error) {
        setFeil('Kunne ikke registrere passnøkkelen. Prøv igjen.');
        setBusy('error');
        return;
      }
      setFerdig(true);
      setBusy('success');
    } catch {
      setFeil('Kunne ikke registrere passnøkkelen. Prøv igjen.');
      setBusy('error');
    }
  }

  function fortsett() {
    void utils.session.me
      .fetch()
      .then((me) => {
        window.location.assign(fortsettEtter2faKvittering(me.landing).destinasjon);
      })
      .catch(() => {
        window.location.assign(fortsettEtter2faKvittering().destinasjon);
      });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 text-fg">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image src="/logo/logo.svg" alt="Endwise" width={44} height={44} priority />
          <h1 className="text-title text-fg">
            {ferdig ? 'Passnøkkel er klar' : 'Sett opp passnøkkel'}
          </h1>
          <p className="text-center text-body text-fg-muted">
            {ferdig
              ? 'Neste innlogging: e-postkode og passnøkkel. En stjålet innboks er ikke nok.'
              : 'Bedriftsbrukere trenger en passnøkkel i tillegg til e-postkoden. Du blir ikke logget ut.'}
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-[5px]">
          <div className="rounded-lg bg-inset p-4 text-[12px] text-fg-muted leading-relaxed">
            {ferdig
              ? 'Nøkkelen er registrert på denne enheten. Fortsett inn i Endwise.'
              : 'Bruk Face ID, Touch ID, Windows Hello eller en sikkerhetsnøkkel. Ingen autentikator-app.'}
          </div>
          {feil ? <p className="px-4 text-[12px] text-danger">{feil}</p> : null}
          <div className="px-1.5 pt-1 pb-1">
            {ferdig ? (
              <StatefulButton
                type="button"
                state="idle"
                className="w-full"
                loadingText=""
                successText=""
                errorText="Prøv igjen"
                icon={<KeyRound size={15} />}
                onClick={fortsett}
              >
                Fortsett
              </StatefulButton>
            ) : (
              <StatefulButton
                type="button"
                state={sesjonLaster ? 'loading' : busy}
                className="w-full"
                loadingText="Venter …"
                successText="Klar"
                errorText="Prøv igjen"
                icon={<KeyRound size={15} />}
                onClick={() => void registrer()}
              >
                Registrer passnøkkel
              </StatefulButton>
            )}
            {feil === MAGIC_LINK_ENROLL_UTEN_SESJON ? (
              <a
                href={SIGNIN_STI}
                className="mt-2 inline-flex h-control w-full items-center justify-center rounded-control border border-border px-3 text-fg text-label"
              >
                Tilbake til innlogging
              </a>
            ) : null}
          </div>
        </div>

        {ferdig ? null : (
          <p className="mt-4 text-center text-[12px] text-fg-muted">
            <button
              type="button"
              onClick={() => {
                void authClient.signOut().finally(() => router.replace('/signin' as Route));
              }}
              className="underline underline-offset-2 hover:text-fg"
            >
              Logg ut
            </button>
          </p>
        )}
      </div>
    </main>
  );
}
