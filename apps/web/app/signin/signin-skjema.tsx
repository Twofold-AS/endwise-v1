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
  flateEtterMagicLinkLanding,
  lagreIdentifisertEpost,
  lesIdentifisertEpost,
  meldingForTotpFeil,
  SIGNIN_ENROLL_STI,
  SIGNIN_STI,
  SIGNIN_VALG_BYTT_KONTO,
  SIGNIN_VALG_LOGG_INN,
  SIGNIN_VALG_SEND_NYTT,
  SIGNIN_VALG_SKRIV_KODE,
  SIGNIN_VALG_STI,
  SIGNIN_VENT_TITTEL,
  type SignInFlate,
  skalViseErstattetMelding,
  toemIdentifisertEpost,
} from './signin-steg';

/**
 * Etter e-post: venteskjerm (lenke i innboksen). Manuell kode er samme
 * engangsbevis — ett felt, ikke to. TOTP-app kommer først etter verify
 * av en bruker som allerede har bundet autentikator.
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

function landingTilFlate(steg: string | null, feil: string | null, totpKlar: boolean): SignInFlate {
  const neste = flateEtterMagicLinkLanding({
    steg,
    feil,
    totpKlar,
    enrollKlar: false,
  });
  return neste === 'enroll' ? 'valg' : neste;
}

function landingFeil(steg: string | null, feil: string | null, totpKlar: boolean): string | null {
  if (steg === 'totp' && totpKlar) return null;
  if (skalViseErstattetMelding({ steg, feil, totpKlar, enrollKlar: false })) {
    return MAGIC_LINK_ERSTATTET_MELDING;
  }
  return meldingForMagicLinkFeil(feil);
}

export function SignInSkjema({ demoHint, totpKlar }: { demoHint: ReactNode; totpKlar: boolean }) {
  const utils = trpc.useUtils();
  const search = useSearchParams();
  const stegQuery = search?.get('steg') ?? null;
  const feilQuery = search?.get('error') ?? null;
  const [flate, setFlate] = useState<SignInFlate>(() =>
    landingTilFlate(stegQuery, feilQuery, totpKlar),
  );
  const [email, setEmail] = useState('');
  const [kode, setKode] = useState('');
  const [totp, setTotp] = useState('');
  const [manuell, setManuell] = useState(false);
  const [error, setError] = useState<string | null>(() =>
    landingFeil(stegQuery, feilQuery, totpKlar),
  );
  const [busy, setBusy] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const kodeRef = useRef<HTMLInputElement>(null);
  const totpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const neste = flateEtterMagicLinkLanding({
      steg: stegQuery,
      feil: feilQuery,
      totpKlar,
      enrollKlar: false,
    });
    if (neste === 'enroll') {
      window.location.replace(SIGNIN_ENROLL_STI);
      return;
    }
    setFlate(neste);
    if (neste === 'totp') {
      setError(null);
      return;
    }
    setError(landingFeil(stegQuery, feilQuery, totpKlar));
  }, [stegQuery, feilQuery, totpKlar]);

  useEffect(() => {
    const lagret = lesIdentifisertEpost();
    if (lagret) setEmail(lagret);
  }, []);

  useEffect(() => {
    if (flate === 'valg' && manuell) kodeRef.current?.focus();
    if (flate === 'totp') totpRef.current?.focus();
  }, [flate, manuell]);

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

  async function sendLenke(adresse: string) {
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
    window.location.assign(SIGNIN_VALG_STI);
  }

  async function onEpost(e: FormEvent) {
    e.preventDefault();
    await sendLenke(email.trim());
  }

  async function onSendPaNytt() {
    const adresse = email.trim() || lesIdentifisertEpost();
    if (!adresse) {
      setError('Skriv e-posten til kontoen på nytt.');
      setFlate('epost');
      settStegIUrl(null);
      return;
    }
    await sendLenke(adresse);
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
    if (!totpKlar) {
      setError(meldingForTotpFeil({ code: 'TOTP_NOT_ENABLED' }));
      setFlate('valg');
      settStegIUrl('valg');
      setBusy('idle');
      return;
    }
    setBusy('loading');
    setError(null);
    const res = await authClient.twoFactor.verifyTotp({ code: totp.trim() });
    if (res.error) {
      const melding = meldingForTotpFeil(res.error);
      setError(melding);
      setBusy('idle');
      setTotp('');
      if (melding.includes('ikke satt opp')) {
        setFlate('valg');
        settStegIUrl('valg');
        return;
      }
      totpRef.current?.focus();
      return;
    }
    await finishSignIn();
  }

  async function byttKonto() {
    toemIdentifisertEpost();
    await authClient.signOut().catch(() => undefined);
    window.location.assign(SIGNIN_STI);
  }

  const tittel =
    flate === 'epost'
      ? 'Logg inn på Endwise'
      : flate === 'totp'
        ? 'Bekreft med autentikator'
        : SIGNIN_VENT_TITTEL /* Trykk på lenken i e-posten */;

  const ingress =
    flate === 'epost'
      ? 'Skriv e-posten til kontoen. Vi sender en innloggingslenke — ingen passord.'
      : flate === 'totp'
        ? 'Skriv den 6-sifrede koden fra autentikator-appen. Ikke en e-postkode.'
        : email
          ? `Vi sendte en innloggingslenke til ${email}. Åpne den nyeste e-posten.`
          : 'Åpne den nyeste e-posten fra Endwise.';

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
                errorText="Prøv igjen"
                icon={<ShieldCheck size={15} />}
              >
                Bekreft
              </StatefulButton>
              <button
                type="button"
                onClick={() => void byttKonto()}
                className="inline-flex h-control w-full items-center justify-center rounded-control border border-border px-3 text-fg text-label hover:bg-surface-2"
              >
                {SIGNIN_VALG_BYTT_KONTO}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-[5px]">
            {manuell ? (
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
                    placeholder="ABCD-EFGH-IJKL"
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
                  {SIGNIN_VALG_LOGG_INN}
                </StatefulButton>
              </form>
            ) : error ? (
              <div className="rounded-lg bg-inset p-4">
                <p className="text-[12px] text-danger">{error ?? MAGIC_LINK_ERSTATTET_MELDING}</p>
              </div>
            ) : null}
            <div className="flex flex-col gap-2 px-1.5 pt-1 pb-1">
              {!manuell && (
                <StatefulButton
                  type="button"
                  state="idle"
                  className="w-full"
                  icon={<Mail size={15} />}
                  onClick={() => {
                    setManuell(true);
                  }}
                >
                  {SIGNIN_VALG_SKRIV_KODE}
                </StatefulButton>
              )}
              <button
                type="button"
                onClick={() => void onSendPaNytt()}
                className="inline-flex h-control w-full items-center justify-center rounded-control border border-border px-3 text-fg text-label hover:bg-surface-2"
              >
                {SIGNIN_VALG_SEND_NYTT}
              </button>
              <button
                type="button"
                onClick={() => void byttKonto()}
                className="inline-flex h-control w-full items-center justify-center rounded-control border border-border px-3 text-fg text-label hover:bg-surface-2"
              >
                {SIGNIN_VALG_BYTT_KONTO}
              </button>
            </div>
          </div>
        )}

        {demoHint}
      </div>
    </main>
  );
}
