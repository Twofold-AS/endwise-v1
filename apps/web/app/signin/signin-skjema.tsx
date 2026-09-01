'use client';

import {
  MAGIC_LINK_ERSTATTET_MELDING,
  magicLinkVerifySti,
  meldingForMagicLinkFeil,
  normaliserMagicLinkKode,
} from '@endwise/auth/magic-link';
import { Mail, ShieldCheck, StatefulButton } from '@endwise/ui';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { authClient, signIn } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { Field, INPUT } from '../_auth/felter';
import { destinasjonNarSesjonFeiler } from '../invitasjon/_landing';
import {
  lagreIdentifisertEpost,
  lesIdentifisertEpost,
  SIGNIN_STI,
  SIGNIN_VALG_STI,
  signInFlateFraQuery,
  toemIdentifisertEpost,
} from './signin-steg';

/**
 * Etter e-post: to knapper. Lenka i e-posten og den manuelle koden er
 * samme engangsbevis. TOTP-app kommer først etter vellykket verify + enrollment.
 */
function feilmelding(res: {
  error?: { status?: number; code?: string; message?: string } | null;
}): string {
  if (res.error?.status === 429) {
    return 'For mange forsøk. Vent ett minutt og prøv igjen.';
  }
  if (res.error?.code === 'INVALID_EMAIL') {
    return 'E-postadressen ser ikke gyldig ut.';
  }
  return res.error?.message ?? 'Innlogging feilet';
}

function settStegIUrl(steg: 'valg' | null) {
  if (typeof window === 'undefined') return;
  const dest = steg === 'valg' ? SIGNIN_VALG_STI : SIGNIN_STI;
  window.history.replaceState(null, '', dest);
}

export function SignInSkjema({ demoHint }: { demoHint: ReactNode }) {
  const utils = trpc.useUtils();
  const search = useSearchParams();
  const stegQuery = search?.get('steg') ?? null;
  const feilQuery = search?.get('error') ?? null;
  const [flate, setFlate] = useState(() => (feilQuery ? 'valg' : signInFlateFraQuery(stegQuery)));
  const [email, setEmail] = useState('');
  const [kode, setKode] = useState('');
  const [totp, setTotp] = useState('');
  const [error, setError] = useState<string | null>(() => meldingForMagicLinkFeil(feilQuery));
  const [busy, setBusy] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const kodeRef = useRef<HTMLInputElement>(null);
  const totpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (feilQuery) {
      setFlate('valg');
      setError(meldingForMagicLinkFeil(feilQuery));
      return;
    }
    setFlate(signInFlateFraQuery(stegQuery));
  }, [stegQuery, feilQuery]);

  useEffect(() => {
    const lagret = lesIdentifisertEpost();
    if (lagret) setEmail(lagret);
  }, []);

  useEffect(() => {
    if (flate === 'valg') kodeRef.current?.focus();
    if (flate === 'totp') totpRef.current?.focus();
  }, [flate]);

  async function finishSignIn() {
    const orgs = await authClient.organization.list();
    const platform = orgs.data?.find((o) => o.slug === 'endwise');
    const first = platform ?? orgs.data?.[0];
    if (first) await authClient.organization.setActive({ organizationId: first.id });
    setBusy('success');
    const landing = await utils.session.me
      .fetch()
      .then((me) => me.landing)
      .catch((err: unknown) => destinasjonNarSesjonFeiler(err));
    window.location.assign(landing ?? '/dashboard');
  }

  async function onEpost(e: FormEvent) {
    e.preventDefault();
    const adresse = email.trim();
    setBusy('loading');
    setError(null);
    lagreIdentifisertEpost(adresse);
    await authClient.signOut().catch(() => undefined);
    const res = await signIn.magicLink({
      email: adresse,
      callbackURL: '/signin',
    });
    if (res.error) {
      setError(feilmelding(res));
      setBusy('error');
      return;
    }
    setFlate('valg');
    settStegIUrl('valg');
    setBusy('idle');
  }

  function onSkrivKodeManuelt(e: FormEvent) {
    e.preventDefault();
    const token = normaliserMagicLinkKode(kode);
    if (token.length === 0) {
      setError('Skriv koden fra den nyeste e-posten.');
      return;
    }
    setBusy('loading');
    setError(null);
    window.location.assign(magicLinkVerifySti(token));
  }

  async function onTotp(e: FormEvent) {
    e.preventDefault();
    setBusy('loading');
    setError(null);
    const res = await authClient.twoFactor.verifyTotp({ code: totp.trim() });
    if (res.error) {
      setError(res.error.message ?? 'Feil eller utløpt kode');
      setBusy('error');
      setTotp('');
      totpRef.current?.focus();
      return;
    }
    await finishSignIn();
  }

  async function byttKonto() {
    toemIdentifisertEpost();
    setEmail('');
    setKode('');
    setTotp('');
    setError(null);
    setBusy('idle');
    setFlate('epost');
    settStegIUrl(null);
    await authClient.signOut().catch(() => undefined);
  }

  const tittel =
    flate === 'epost'
      ? 'Logg inn på Endwise'
      : flate === 'totp'
        ? 'Bekreft med autentikator'
        : 'Sjekk e-posten';

  const ingress =
    flate === 'epost'
      ? 'Skriv e-posten til kontoen. Vi sender en innloggingslenke — ingen passord.'
      : flate === 'totp'
        ? 'Skriv den 6-sifrede koden fra autentikator-appen. Ikke en e-postkode.'
        : email
          ? `Lenke sendt til ${email}. Åpne den nyeste e-posten, eller skriv koden derfra.`
          : 'Åpne den nyeste e-posten, eller skriv koden derfra.';

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 text-fg">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image src="/logo/logo.svg" alt="Endwise" width={44} height={44} priority />
          <h1 className="text-title text-fg">{tittel}</h1>
          <p className="text-center text-body text-fg-muted">{ingress}</p>
        </div>

        {flate === 'epost' ? (
          <form
            onSubmit={onEpost}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-[5px]"
          >
            <div className="flex flex-col gap-3 rounded-lg bg-inset p-4">
              <Field id="signin-email" label="E-post">
                <input
                  id="signin-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  className={INPUT}
                  placeholder="deg@twofold.no"
                />
              </Field>
              {error && <p className="text-[12px] text-danger">{error}</p>}
            </div>
            <div className="px-1.5 pt-1 pb-1">
              <StatefulButton
                type="submit"
                state={busy}
                className="w-full"
                loadingText="Sender lenke…"
                successText="Sendt"
                errorText="Prøv igjen"
                icon={<Mail size={15} />}
              >
                Fortsett
              </StatefulButton>
            </div>
          </form>
        ) : flate === 'totp' ? (
          <form
            onSubmit={(e) => void onTotp(e)}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-[5px]"
          >
            <div className="flex flex-col gap-3 rounded-lg bg-inset p-4">
              <Field id="signin-totp" label="App-kode">
                <input
                  id="signin-totp"
                  ref={totpRef}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={totp}
                  onChange={(ev) => setTotp(ev.target.value.replace(/\D/g, ''))}
                  className={`${INPUT} text-center font-mono text-[16px] tracking-[0.5em] tabular-nums`}
                  placeholder="••••••"
                />
              </Field>
              {error && <p className="text-[12px] text-danger">{error}</p>}
            </div>
            <div className="flex flex-col gap-2 px-1.5 pt-1 pb-1">
              <StatefulButton
                type="submit"
                state={busy}
                className="w-full"
                loadingText="Sjekker koden…"
                successText="Bekreftet"
                errorText="Feil kode"
                icon={<ShieldCheck size={15} />}
              >
                Bekreft
              </StatefulButton>
              <button
                type="button"
                onClick={() => void byttKonto()}
                className="inline-flex h-control w-full items-center justify-center rounded-control border border-border px-3 text-fg text-label hover:bg-surface-2"
              >
                Bytt konto
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-[5px]">
            <form
              onSubmit={onSkrivKodeManuelt}
              className="flex flex-col gap-3 rounded-lg bg-inset p-4"
            >
              <Field id="signin-magic-kode" label="Kode fra e-posten">
                <input
                  id="signin-magic-kode"
                  ref={kodeRef}
                  autoComplete="one-time-code"
                  inputMode="text"
                  value={kode}
                  onChange={(ev) => setKode(ev.target.value.toUpperCase())}
                  className={`${INPUT} text-center font-mono text-[16px] tracking-[0.2em] tabular-nums`}
                  placeholder="XXXX-XXXX-XXXX"
                />
              </Field>
              {error && (
                <p className="text-[12px] text-danger">{error ?? MAGIC_LINK_ERSTATTET_MELDING}</p>
              )}
              <StatefulButton
                type="submit"
                state={busy}
                className="w-full"
                loadingText="Sjekker koden…"
                successText="Bekreftet"
                errorText="Prøv igjen"
                icon={<ShieldCheck size={15} />}
              >
                Skriv kode manuelt
              </StatefulButton>
            </form>
            <div className="px-1.5 pb-1">
              <button
                type="button"
                onClick={() => void byttKonto()}
                className="inline-flex h-control w-full items-center justify-center rounded-control border border-border px-3 text-fg text-label hover:bg-surface-2"
              >
                Bytt konto
              </button>
            </div>
          </div>
        )}

        {demoHint}
      </div>
    </main>
  );
}
