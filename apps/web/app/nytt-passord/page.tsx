'use client';

import { KeyRound, ShieldCheck, StatefulButton } from '@endwise/ui';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type FormEvent, Suspense, useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { PassordFelt } from '../_auth/felter';

/**
 * F1-16 — sett nytt passord. Andre halvdel av flyten som starter i
 * `/glemt-passord`.
 *
 * ── Hvor tokenet kommer fra ──────────────────────────────────────────────
 * `sendResetPassword` i `packages/auth/src/auth.ts` bygger lenka rett hit med
 * `?token=…`, i stedet for å bruke Better-Auths eget redirect-endepunkt. Ett
 * ledd mindre der tokenet står i en URL. Selve valideringen skjer uansett
 * server-side når `POST /reset-password` konsumerer det.
 *
 * ── ⚠️ Tokenet fjernes fra adressefeltet med én gang ─────────────────────
 * `history.replaceState` stryker query-strengen etter at vi har lest den.
 * Tokenet er en engangsnøkkel til kontoen, og så lenge det står i URL-en
 * ligger det i nettleserhistorikken, i alt som deler skjerm, og i `Referer`
 * på enhver utgående forespørsel siden måtte gjøre. Det koster én linje å
 * ikke la det bli liggende.
 *
 * ⛔ Vi verifiserer IKKE tokenet ved sidelast. Et «sjekk om det er gyldig»-
 * kall ville vært et gratis orakel for å teste tokens uten å bruke dem opp.
 * Brukeren får svaret når hen sender inn passordet — som er det eneste
 * tidspunktet svaret betyr noe.
 */
function NyttPassordInner() {
  const params = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [klar, setKlar] = useState(false);
  const [passord, setPassord] = useState('');
  const [gjenta, setGjenta] = useState('');
  const [feil, setFeil] = useState<string | null>(null);
  const [ferdig, setFerdig] = useState(false);
  const [busy, setBusy] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    setToken(params?.get('token') ?? null);
    setKlar(true);
    // Se filkommentaren: ut av adressefeltet så snart vi har lest det.
    if (params?.get('token')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [params]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFeil(null);

    // Klientsjekkene her er bekvemmelighet, ikke sikkerhet: server-side
    // håndhever `minPasswordLength: 12` uansett (låst i passord-reset.test.ts).
    if (passord !== gjenta) {
      setFeil('De to passordene er ikke like.');
      return;
    }
    if (passord.length < 12) {
      setFeil('Passordet må være minst 12 tegn.');
      return;
    }

    setBusy('loading');
    const res = await authClient.resetPassword({
      newPassword: passord,
      token: token ?? '',
    });

    if (res.error) {
      /**
       * ⚠️ Better-Auth svarer `INVALID_TOKEN` på både brukt, utløpt og oppdiktet
       * token — den skiller dem ikke, og det er riktig: forskjellen ville
       * fortalt en angriper om et token har eksistert. Teksten vår må derfor
       * dekke alle tre, og peke på veien videre i stedet for å gjette årsak.
       */
      setBusy('error');
      setFeil(
        'Lenken virker ikke lenger. Den kan bare brukes én gang og varer i 30 minutter — be om en ny.',
      );
      return;
    }

    setBusy('success');
    setFerdig(true);
  }

  if (!klar) return null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 text-fg">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image src="/logo/logo.svg" alt="Endwise" width={44} height={44} priority />
          <h1 className="text-title text-fg">
            {ferdig ? 'Passordet er byttet' : 'Velg nytt passord'}
          </h1>
          <p className="text-center text-body text-fg-muted">
            {ferdig
              ? 'Du er logget ut på alle enheter. Logg inn med det nye passordet.'
              : 'Minst 12 tegn. Du blir logget ut på alle enheter når det er byttet.'}
          </p>
        </div>

        {ferdig ? (
          <div className="rounded-xl border border-border bg-card p-[5px]">
            <div className="flex flex-col gap-3 rounded-lg bg-inset p-4">
              <p className="flex items-start gap-2 text-[12px] text-fg-muted leading-relaxed">
                <ShieldCheck size={13} className="mt-px shrink-0" />
                <span>
                  Neste innlogging krever engangskode som vanlig — et byttet passord er ingen vei
                  utenom tofaktor.
                </span>
              </p>
              <Link
                href="/signin"
                className="inline-flex h-control items-center justify-center rounded-control bg-fg px-4 text-bg text-label"
              >
                Til innlogging
              </Link>
            </div>
          </div>
        ) : !token ? (
          /* Ingen token i adressen — som regel fordi lenka er klippet i to av
             en e-postklient, eller fordi noen åpnet sida direkte. */
          <div className="rounded-xl border border-border bg-card p-[5px]">
            <div className="flex flex-col gap-3 rounded-lg bg-inset p-4">
              <p className="text-[12px] text-fg-muted leading-relaxed">
                Denne siden må åpnes fra lenken i e-posten. Mangler du den, kan du be om en ny.
              </p>
              <Link
                href="/glemt-passord"
                className="inline-flex h-control items-center justify-center rounded-control border border-border px-4 text-fg text-label transition-colors hover:bg-surface-2"
              >
                Be om ny lenke
              </Link>
            </div>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-[5px]"
          >
            <div className="flex flex-col gap-3 rounded-lg bg-inset p-4">
              <PassordFelt
                id="nytt-passord"
                label="Nytt passord"
                value={passord}
                onChange={setPassord}
                autoComplete="new-password"
                autoFocus
                beskrivelse="Minst 12 tegn."
              />
              <PassordFelt
                id="nytt-passord-gjenta"
                label="Gjenta nytt passord"
                value={gjenta}
                onChange={setGjenta}
                autoComplete="new-password"
              />
              {feil && <p className="text-[12px] text-danger">{feil}</p>}
            </div>
            <div className="px-1.5 pt-1 pb-1">
              <StatefulButton
                type="submit"
                state={busy}
                className="w-full"
                loadingText="Lagrer …"
                successText="Byttet"
                errorText="Prøv igjen"
                icon={<KeyRound size={15} />}
              >
                Lagre nytt passord
              </StatefulButton>
            </div>
          </form>
        )}

        {!ferdig && (
          <p className="mt-4 text-center text-[12px] text-fg-muted">
            <Link href="/signin" className="underline underline-offset-2 hover:text-fg">
              Tilbake til innlogging
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}

/** ⚠️ Suspense-grense er PÅKREVD: siden leser `useSearchParams()` (?token=). */
export default function NyttPassordPage() {
  return (
    <Suspense fallback={null}>
      <NyttPassordInner />
    </Suspense>
  );
}
