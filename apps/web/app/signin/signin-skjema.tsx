'use client';

import {
  erMagicLinkKode,
  MAGIC_LINK_ERSTATTET_MELDING,
  magicLinkVerifySti,
  meldingForMagicLinkFeil,
  normaliserMagicLinkKode,
} from '@endwise/auth/magic-link';
import { ArrowRight, ShieldCheck, StatefulButton } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { authClient, signIn } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { Field, INPUT } from '../_auth/felter';
import { AuthMerke } from '../_auth/merke';
import { destinasjonNarSesjonFeiler } from '../invitasjon/_landing';
import {
  flateEtterMagicLinkLanding,
  lagreIdentifisertEpost,
  lesIdentifisertEpost,
  meldingForTotpFeil,
  SIGNIN_ENROLL_STI,
  SIGNIN_FORTSETT,
  SIGNIN_FYLL_KODE,
  SIGNIN_IKKE_DEG,
  SIGNIN_KODE_INGRESS,
  SIGNIN_STI,
  SIGNIN_TITTEL,
  SIGNIN_VALG_STI,
  SIGNIN_VILKAR,
  SIGNIN_VILKAR_STI,
  type SignInFlate,
  skalViseErstattetMelding,
  toemIdentifisertEpost,
} from './signin-steg';

/**
 * Etter e-post: kode-steg (5 siffer). Magic-lenka er samme engangsbevis.
 * TOTP-app kommer først etter verify av en bruker som allerede har bundet
 * autentikator.
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

type SignInHandling = 'fortsett' | 'logg-inn' | 'totp';

function landingFeil(steg: string | null, feil: string | null, totpKlar: boolean): string | null {
  if (steg === 'totp' && totpKlar) return null;
  if (skalViseErstattetMelding({ steg, feil, totpKlar, enrollKlar: false })) {
    return MAGIC_LINK_ERSTATTET_MELDING;
  }
  return meldingForMagicLinkFeil(feil);
}

export function SignInSkjema({ totpKlar }: { totpKlar: boolean }) {
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
  const [error, setError] = useState<string | null>(() =>
    landingFeil(stegQuery, feilQuery, totpKlar),
  );
  const [busy, setBusy] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [handling, setHandling] = useState<SignInHandling | null>(null);
  const kodeRef = useRef<HTMLInputElement>(null);
  const totpRef = useRef<HTMLInputElement>(null);

  function knappState(hvilken: SignInHandling) {
    return handling === hvilken ? busy : 'idle';
  }

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
    window.location.assign(landing ?? '/home');
  }

  async function sendLenke(adresse: string, hvilken: 'fortsett') {
    setHandling(hvilken);
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
    await sendLenke(email.trim(), 'fortsett');
  }

  function onSkrivKode(e: FormEvent) {
    e.preventDefault();
    const token = normaliserMagicLinkKode(kode);
    if (!erMagicLinkKode(token)) {
      setError('Skriv den 5-sifrede koden fra e-posten.');
      return;
    }
    setHandling('logg-inn');
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
    setHandling('totp');
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

  const tittel = flate === 'totp' ? 'Bekreft med autentikator' : SIGNIN_TITTEL;

  return (
    <main className="flex min-h-dvh justify-center bg-bg px-4 pt-[max(2.5rem,12vh)] pb-16 text-fg">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex justify-center">
          <AuthMerke />
        </div>

        {flate === 'epost' ? (
          <form
            onSubmit={onEpost}
            data-auth-kort
            className="flex flex-col gap-2 rounded-[24px] border border-border bg-card p-4"
          >
            <h1 className="mb-1 text-[28px] font-[650] leading-[34px] tracking-[-0.03em] text-fg">
              {tittel}
            </h1>
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
            {error && <p className="text-[13px] text-danger">{error}</p>}
            <StatefulButton
              type="submit"
              state={knappState('fortsett')}
              className="w-full"
              loadingText="Sender…"
              successText="Sendt"
              errorText="Prøv igjen"
              icon={<ArrowRight size={16} />}
            >
              {SIGNIN_FORTSETT}
            </StatefulButton>
            <p className="pt-1 text-center text-[13px] font-[450] leading-5 text-fg-muted">
              {SIGNIN_VILKAR}{' '}
              <Link
                href={SIGNIN_VILKAR_STI as Route}
                className="font-[650] text-fg underline underline-offset-2"
              >
                Vilkår
              </Link>
            </p>
          </form>
        ) : flate === 'totp' ? (
          <form
            onSubmit={(e) => void onTotp(e)}
            data-auth-kort
            className="flex flex-col gap-2 rounded-[24px] border border-border bg-card p-4"
          >
            <h1 className="mb-1 text-[28px] font-[650] leading-[34px] tracking-[-0.03em] text-fg">
              {tittel}
            </h1>
            <p className="mb-1 text-[15px] font-[450] leading-[22px] text-fg-muted">
              Skriv den 6-sifrede koden fra autentikator-appen. Ikke en e-postkode.
            </p>
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
                className={`${INPUT} text-center tabular-nums tracking-[0.35em]`}
                placeholder="••••••"
              />
            </Field>
            {error && <p className="text-[13px] text-danger">{error}</p>}
            <StatefulButton
              type="submit"
              state={knappState('totp')}
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
              className="pt-1 text-center text-[15px] font-[650] text-fg underline underline-offset-2"
            >
              {SIGNIN_IKKE_DEG}
            </button>
          </form>
        ) : (
          <form
            onSubmit={onSkrivKode}
            data-auth-kort
            data-auth-kode-steg
            className="flex flex-col gap-2 rounded-[24px] border border-border bg-card p-4"
          >
            <h1 className="mb-1 text-[28px] font-[650] leading-[34px] tracking-[-0.03em] text-fg">
              {tittel}
            </h1>
            <p className="text-[15px] font-[450] leading-[22px] text-fg-muted">
              {SIGNIN_KODE_INGRESS}{' '}
              <span className="font-[650] text-fg">{email || 'e-posten din'}</span>.
            </p>
            <button
              type="button"
              onClick={() => void byttKonto()}
              className="mb-1 self-start text-[15px] font-[650] text-fg underline underline-offset-2"
            >
              {SIGNIN_IKKE_DEG}
            </button>
            <Field id="signin-magic-kode" label={SIGNIN_FYLL_KODE}>
              <input
                id="signin-magic-kode"
                ref={kodeRef}
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={5}
                value={kode}
                onChange={(ev) => setKode(normaliserMagicLinkKode(ev.target.value))}
                className={`${INPUT} tabular-nums tracking-[0.35em]`}
                placeholder="•••••"
              />
            </Field>
            {error && (
              <p className="text-[13px] text-danger">{error ?? MAGIC_LINK_ERSTATTET_MELDING}</p>
            )}
            <StatefulButton
              type="submit"
              state={knappState('logg-inn')}
              className="w-full"
              loadingText="Sjekker koden…"
              successText="Bekreftet"
              errorText="Prøv igjen"
              icon={<ArrowRight size={16} />}
            >
              {SIGNIN_FORTSETT}
            </StatefulButton>
          </form>
        )}
      </div>
    </main>
  );
}
