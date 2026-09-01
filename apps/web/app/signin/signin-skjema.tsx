'use client';

import { Mail, ShieldCheck, StatefulButton } from '@endwise/ui';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { authClient, signIn } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { Field, INPUT } from '../_auth/felter';
import { destinasjonNarSesjonFeiler } from '../invitasjon/_landing';

/**
 * Innlogging: magic link til konto-e-post, deretter TOTP-app.
 * Ingen passord. Ingen e-postkode som andre faktor.
 */
type Step = 'epost' | 'sendt' | 'totp' | 'gjenoppretting';

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

export function SignInSkjema({ demoHint }: { demoHint: ReactNode }) {
  const utils = trpc.useUtils();
  const search = useSearchParams();
  const [step, setStep] = useState<Step>(() => (search?.get('steg') === 'totp' ? 'totp' : 'epost'));
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (search?.get('steg') === 'totp') setStep('totp');
  }, [search]);

  useEffect(() => {
    if (step === 'totp' || step === 'gjenoppretting') codeRef.current?.focus();
  }, [step]);

  async function finishSignIn() {
    const orgs = await authClient.organization.list();
    const platform = orgs.data?.find((o) => o.slug === 'endwise');
    const first = platform ?? orgs.data?.[0];
    if (first) await authClient.organization.setActive({ organizationId: first.id });
    setBusy('success');
    const landing = await utils.session.me
      .fetch()
      .then((me) => me.landing)
      .catch((error: unknown) => destinasjonNarSesjonFeiler(error));
    window.location.assign(landing ?? '/dashboard');
  }

  async function onEpost(e: FormEvent) {
    e.preventDefault();
    setBusy('loading');
    setError(null);
    const res = await signIn.magicLink({
      email: email.trim(),
      callbackURL: '/signin',
    });
    if (res.error) {
      setError(feilmelding(res));
      setBusy('error');
      return;
    }
    setStep('sendt');
    setBusy('idle');
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    setBusy('loading');
    setError(null);
    const res =
      step === 'gjenoppretting'
        ? await authClient.twoFactor.verifyBackupCode({ code: code.trim() })
        : await authClient.twoFactor.verifyTotp({ code: code.trim() });
    if (res.error) {
      setError(res.error.message ?? 'Feil eller utløpt kode');
      setBusy('error');
      setCode('');
      codeRef.current?.focus();
      return;
    }
    await finishSignIn();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 text-fg">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image src="/logo/logo.svg" alt="Endwise" width={44} height={44} priority />
          <h1 className="text-title text-fg">
            {step === 'epost'
              ? 'Logg inn på Endwise'
              : step === 'sendt'
                ? 'Sjekk e-posten'
                : step === 'gjenoppretting'
                  ? 'Bruk gjenopprettingskode'
                  : 'Bekreft med autentikator'}
          </h1>
          <p className="text-center text-body text-fg-muted">
            {step === 'epost'
              ? 'Vi sender en innloggingslenke til kontoen din. Deretter bekrefter du med appen.'
              : step === 'sendt'
                ? `Lenke sendt til ${email}. Åpne den på denne enheten.`
                : step === 'gjenoppretting'
                  ? 'En av kodene du lastet ned da du satte opp tofaktor. Hver kode kan brukes én gang.'
                  : 'Skriv den 6-sifrede koden fra autentikator-appen. Ikke en e-postkode.'}
          </p>
        </div>

        {step === 'epost' ? (
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
                Send innloggingslenke
              </StatefulButton>
            </div>
          </form>
        ) : step === 'sendt' ? (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-[5px]">
            <div className="rounded-lg bg-inset p-4 text-[12px] text-fg-muted leading-relaxed">
              Åpne lenken i e-posten. Etterpå spør vi om koden fra autentikator-appen — en stjålet
              innboks er ikke nok.
            </div>
            <div className="px-1.5 pt-1 pb-1">
              <button
                type="button"
                onClick={() => {
                  setStep('epost');
                  setBusy('idle');
                  setError(null);
                }}
                className="text-[12px] text-fg-muted underline underline-offset-2 hover:text-fg"
              >
                Bytt konto
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={onVerify}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-[5px]"
          >
            <div className="flex flex-col gap-3 rounded-lg bg-inset p-4">
              <Field
                id="signin-totp"
                label={step === 'gjenoppretting' ? 'Gjenopprettingskode' : 'App-kode'}
              >
                <input
                  id="signin-totp"
                  ref={codeRef}
                  autoComplete={step === 'gjenoppretting' ? 'off' : 'one-time-code'}
                  inputMode={step === 'gjenoppretting' ? 'text' : 'numeric'}
                  pattern={step === 'gjenoppretting' ? undefined : '[0-9]*'}
                  maxLength={step === 'gjenoppretting' ? 16 : 6}
                  required
                  value={code}
                  onChange={(ev) =>
                    setCode(
                      step === 'gjenoppretting'
                        ? ev.target.value.trim()
                        : ev.target.value.replace(/\D/g, ''),
                    )
                  }
                  className={
                    step === 'gjenoppretting'
                      ? `${INPUT} text-center font-mono text-[16px] tabular-nums`
                      : `${INPUT} text-center font-mono text-[16px] tracking-[0.5em] tabular-nums`
                  }
                  placeholder={step === 'gjenoppretting' ? 'xxxxx-xxxxx' : '••••••'}
                />
              </Field>
              {error && <p className="text-[12px] text-danger">{error}</p>}
              <div className="flex items-center justify-between gap-2">
                {step === 'gjenoppretting' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setStep('totp');
                      setCode('');
                      setError(null);
                      setBusy('idle');
                    }}
                    className="text-[12px] text-fg-muted underline underline-offset-2 hover:text-fg"
                  >
                    Tilbake til app-kode
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setStep('gjenoppretting');
                      setCode('');
                      setError(null);
                      setBusy('idle');
                    }}
                    className="text-[12px] text-fg-muted underline underline-offset-2 hover:text-fg"
                  >
                    Bruk gjenopprettingskode
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setStep('epost');
                    setCode('');
                    setError(null);
                    setBusy('idle');
                  }}
                  className="text-[12px] text-fg-muted hover:text-fg"
                >
                  Bytt konto
                </button>
              </div>
            </div>
            <div className="px-1.5 pt-1 pb-1">
              <StatefulButton
                type="submit"
                state={busy}
                className="w-full"
                loadingText="Sjekker koden…"
                successText="Bekreftet"
                errorText="Feil kode"
                icon={<ShieldCheck size={15} />}
              >
                Bekreft og logg inn
              </StatefulButton>
            </div>
          </form>
        )}

        {step === 'epost' || step === 'sendt' ? demoHint : null}
      </div>
    </main>
  );
}
