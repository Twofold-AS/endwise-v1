'use client';

import {
  erMagicLinkKode,
  MAGIC_LINK_ERSTATTET_MELDING,
  meldingForMagicLinkFeil,
  normaliserMagicLinkKode,
} from '@endwise/auth/magic-link';
import { ArrowRight, FeltInput, FeltKode, KeyRound, StatefulButton } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { authClient, signIn } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { AuthMerke } from '../_auth/merke';
import { destinasjonNarSesjonFeiler } from '../invitasjon/_landing';
import {
  flateEtterMagicLinkLanding,
  lagreIdentifisertEpost,
  lesIdentifisertEpost,
  SIGNIN_ENROLL_STI,
  SIGNIN_FORTSETT,
  SIGNIN_FYLL_KODE,
  SIGNIN_IKKE_DEG,
  SIGNIN_KODE_INGRESS,
  SIGNIN_STI,
  SIGNIN_VALG_STI,
  SIGNIN_VILKAR,
  SIGNIN_VILKAR_STI,
  type SignInFlate,
  skalViseErstattetMelding,
  toemIdentifisertEpost,
} from './signin-steg';

/**
 * Etter e-post: kode-steg (5 siffer). Andre faktor er passnøkkel,
 * ikke TOTP. Uenrollert bedrift lander på /2fa-oppsett med sesjon.
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

function landingTilFlate(steg: string | null, feil: string | null): SignInFlate {
  const neste = flateEtterMagicLinkLanding({
    steg,
    feil,
    totpKlar: false,
    enrollKlar: false,
  });
  return neste === 'enroll' ? 'valg' : neste;
}

type SignInHandling = 'fortsett' | 'logg-inn' | 'passkey';

const AUTH_FLATE = 'flex flex-col gap-4';
const AUTH_FORTSETT = 'h-auto w-full py-5';

function landingFeil(steg: string | null, feil: string | null): string | null {
  if (skalViseErstattetMelding({ steg, feil, totpKlar: false, enrollKlar: false })) {
    return MAGIC_LINK_ERSTATTET_MELDING;
  }
  return meldingForMagicLinkFeil(feil);
}

export function SignInSkjema() {
  const utils = trpc.useUtils();
  const search = useSearchParams();
  const stegQuery = search?.get('steg') ?? null;
  const feilQuery = search?.get('error') ?? null;
  const [flate, setFlate] = useState<SignInFlate>(() => landingTilFlate(stegQuery, feilQuery));
  const [email, setEmail] = useState('');
  const [kode, setKode] = useState('');
  const [error, setError] = useState<string | null>(() => landingFeil(stegQuery, feilQuery));
  const [busy, setBusy] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [handling, setHandling] = useState<SignInHandling | null>(null);
  const kodeRef = useRef<HTMLDivElement>(null);

  function knappState(hvilken: SignInHandling) {
    return handling === hvilken ? busy : 'idle';
  }

  useEffect(() => {
    const neste = flateEtterMagicLinkLanding({
      steg: stegQuery,
      feil: feilQuery,
      totpKlar: false,
      enrollKlar: false,
    });
    if (neste === 'enroll') {
      window.location.replace(SIGNIN_ENROLL_STI);
      return;
    }
    setFlate(neste);
    setError(landingFeil(stegQuery, feilQuery));
  }, [stegQuery, feilQuery]);

  useEffect(() => {
    const lagret = lesIdentifisertEpost();
    if (lagret) setEmail(lagret);
  }, []);

  useEffect(() => {
    if (flate === 'valg') kodeRef.current?.querySelector('input')?.focus();
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

  async function onSkrivKode(e: FormEvent) {
    e.preventDefault();
    const token = normaliserMagicLinkKode(kode);
    if (!erMagicLinkKode(token)) {
      setError('Skriv den 5-sifrede koden fra e-posten.');
      return;
    }
    setHandling('logg-inn');
    setBusy('loading');
    setError(null);
    try {
      const res = await authClient.magicLink.verify({
        query: { token, callbackURL: '/signin' },
      });
      if (res.error) {
        setError(feilmelding(res));
        setBusy('error');
        return;
      }
      await finishSignIn();
    } catch (err) {
      const status =
        err && typeof err === 'object' && 'status' in err
          ? Number((err as { status: unknown }).status)
          : 0;
      setError(
        status === 429
          ? 'For mange forsøk. Vent ett minutt og prøv igjen.'
          : 'Innlogging feilet. Prøv igjen, eller be om ny kode.',
      );
      setBusy('error');
    }
  }

  async function onPasskey() {
    setHandling('passkey');
    setBusy('loading');
    setError(null);
    try {
      const klient = authClient as typeof authClient & {
        signIn: typeof authClient.signIn & {
          passkey?: (opts?: { autoFill?: boolean }) => Promise<{ error?: unknown }>;
        };
      };
      const inn = await klient.signIn.passkey?.();
      if (inn?.error) {
        setBusy('idle');
        return;
      }
      await finishSignIn();
    } catch {
      setBusy('idle');
    }
  }

  async function byttKonto() {
    toemIdentifisertEpost();
    await authClient.signOut().catch(() => undefined);
    window.location.assign(SIGNIN_STI);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4 pb-[14vh] text-fg">
      <div className="w-full max-w-sm">
        <div className="mt-8 mb-10 flex justify-center">
          <AuthMerke />
        </div>

        {flate === 'epost' ? (
          <form onSubmit={onEpost} className={AUTH_FLATE}>
            <FeltInput
              id="signin-email"
              storrelse="lg"
              type="email"
              autoComplete="email"
              isRequired
              label="E-post"
              value={email}
              onChange={setEmail}
              placeholder="deg@twofold.no"
            />
            {error && <p className="text-meta text-danger">{error}</p>}
            <StatefulButton
              type="submit"
              state={knappState('fortsett')}
              className={AUTH_FORTSETT}
              loadingText=""
              successText=""
              errorText="Prøv igjen"
              icon={<ArrowRight size={16} />}
            >
              {SIGNIN_FORTSETT}
            </StatefulButton>
            <button
              type="button"
              onClick={() => void onPasskey()}
              className="inline-flex h-12 items-center justify-center gap-2 text-[15px] font-[650] text-fg underline underline-offset-2"
            >
              <KeyRound size={16} />
              Bruk nøkkel
            </button>
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
        ) : (
          <form onSubmit={(e) => void onSkrivKode(e)} data-auth-kode-steg className={AUTH_FLATE}>
            <p className="text-center text-[15px] font-[450] leading-[22px] text-fg-muted">
              {SIGNIN_KODE_INGRESS}
            </p>
            <button
              type="button"
              onClick={() => void byttKonto()}
              className="mb-1 w-full text-center text-[15px] font-[650] text-fg underline underline-offset-2"
            >
              {SIGNIN_IKKE_DEG}
            </button>
            <p className="text-label text-fg-muted">{SIGNIN_FYLL_KODE}</p>
            <div id="signin-magic-kode" data-signin-magic-kode>
              <FeltKode
                ref={kodeRef}
                aria-label={SIGNIN_FYLL_KODE}
                length={5}
                value={kode}
                onChange={(v) => setKode(normaliserMagicLinkKode(v))}
                isInvalid={Boolean(error)}
              />
            </div>
            {error && <p className="text-meta text-danger">{error}</p>}
            <StatefulButton
              type="submit"
              state={knappState('logg-inn')}
              className={AUTH_FORTSETT}
              loadingText=""
              successText=""
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
