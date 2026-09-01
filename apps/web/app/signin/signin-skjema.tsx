'use client';

import { TO_FAKTOR_OPPSETT_STI } from '@endwise/auth/to-faktor-oppsett';
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
  totpFeltAktivt,
  trengerEnrollForklaring,
} from './signin-steg';

/**
 * Innlogging: e-post → tre synlige valg.
 * TOTP-feltet er aktivt bare etter magic link når twoFactorEnabled er på.
 * Uenrollert: magic link, deretter /2fa-oppsett. Ingen kode-vegg.
 */
type KodeModus = 'totp' | 'gjenoppretting';

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
  const [flate, setFlate] = useState(() => signInFlateFraQuery(stegQuery));
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [kodeModus, setKodeModus] = useState<KodeModus>('totp');
  const [lenkeSendt, setLenkeSendt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [magicBusy, setMagicBusy] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const codeRef = useRef<HTMLInputElement>(null);
  const enrollert = totpFeltAktivt(stegQuery);
  const visEnroll = trengerEnrollForklaring(stegQuery);

  useEffect(() => {
    setFlate(signInFlateFraQuery(stegQuery));
  }, [stegQuery]);

  useEffect(() => {
    const lagret = lesIdentifisertEpost();
    if (lagret) setEmail(lagret);
  }, []);

  useEffect(() => {
    if (flate === 'valg' && enrollert) codeRef.current?.focus();
  }, [flate, enrollert]);

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

  async function sendMagicLink(adresse: string) {
    const res = await signIn.magicLink({
      email: adresse,
      callbackURL: '/signin',
    });
    if (res.error) {
      setError(feilmelding(res));
      return false;
    }
    setLenkeSendt(true);
    setError(null);
    return true;
  }

  async function onEpost(e: FormEvent) {
    e.preventDefault();
    const adresse = email.trim();
    setBusy('loading');
    setError(null);
    lagreIdentifisertEpost(adresse);
    const ok = await sendMagicLink(adresse);
    if (!ok) {
      setBusy('error');
      return;
    }
    setFlate('valg');
    settStegIUrl('valg');
    setBusy('idle');
  }

  async function onMagicLinkPaaNytt() {
    const adresse = email.trim();
    if (!adresse) {
      setError('Skriv e-postadressen først.');
      return;
    }
    setMagicBusy('loading');
    setError(null);
    lagreIdentifisertEpost(adresse);
    const ok = await sendMagicLink(adresse);
    setMagicBusy(ok ? 'success' : 'error');
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    if (!enrollert) return;
    setBusy('loading');
    setError(null);
    const res =
      kodeModus === 'gjenoppretting'
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

  async function byttKonto() {
    toemIdentifisertEpost();
    setEmail('');
    setCode('');
    setError(null);
    setLenkeSendt(false);
    setKodeModus('totp');
    setBusy('idle');
    setMagicBusy('idle');
    setFlate('epost');
    settStegIUrl(null);
    await authClient.signOut().catch(() => undefined);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 text-fg">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image src="/logo/logo.svg" alt="Endwise" width={44} height={44} priority />
          <h1 className="text-title text-fg">
            {flate === 'epost' ? 'Logg inn på Endwise' : 'Velg innloggingsmåte'}
          </h1>
          <p className="text-center text-body text-fg-muted">
            {flate === 'epost'
              ? 'Skriv e-posten til kontoen. Vi sender en innloggingslenke — ingen passord.'
              : email
                ? `Konto: ${email}`
                : 'Tre valg. Magic link først hvis du ikke har bundet en app.'}
          </p>
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
        ) : (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-[5px]">
            <div className="flex flex-col gap-4 rounded-lg bg-inset p-4">
              <section className="flex flex-col gap-2">
                <h2 className="text-label text-fg">Skriv inn kode</h2>
                {visEnroll ? (
                  <p className="text-[12px] text-fg-muted leading-relaxed">
                    Du har ikke bundet en autentikator-app ennå. Logg inn med magic link først — så
                    åpner vi oppsettet der du binder appen. Ikke en e-postkode.
                  </p>
                ) : (
                  <form onSubmit={(e) => void onVerify(e)} className="flex flex-col gap-2">
                    <Field
                      id="signin-totp"
                      label={kodeModus === 'gjenoppretting' ? 'Gjenopprettingskode' : 'App-kode'}
                    >
                      <input
                        id="signin-totp"
                        ref={codeRef}
                        autoComplete={kodeModus === 'gjenoppretting' ? 'off' : 'one-time-code'}
                        inputMode={kodeModus === 'gjenoppretting' ? 'text' : 'numeric'}
                        pattern={kodeModus === 'gjenoppretting' ? undefined : '[0-9]*'}
                        maxLength={kodeModus === 'gjenoppretting' ? 16 : 6}
                        required
                        value={code}
                        onChange={(ev) =>
                          setCode(
                            kodeModus === 'gjenoppretting'
                              ? ev.target.value.trim()
                              : ev.target.value.replace(/\D/g, ''),
                          )
                        }
                        className={
                          kodeModus === 'gjenoppretting'
                            ? `${INPUT} text-center font-mono text-[16px] tabular-nums`
                            : `${INPUT} text-center font-mono text-[16px] tracking-[0.5em] tabular-nums`
                        }
                        placeholder={kodeModus === 'gjenoppretting' ? 'xxxxx-xxxxx' : '••••••'}
                      />
                    </Field>
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
                    <button
                      type="button"
                      onClick={() => {
                        setKodeModus(kodeModus === 'totp' ? 'gjenoppretting' : 'totp');
                        setCode('');
                        setError(null);
                        setBusy('idle');
                      }}
                      className="text-left text-[12px] text-fg-muted underline underline-offset-2 hover:text-fg"
                    >
                      {kodeModus === 'gjenoppretting'
                        ? 'Tilbake til app-kode'
                        : 'Bruk gjenopprettingskode'}
                    </button>
                  </form>
                )}
                <a
                  href={TO_FAKTOR_OPPSETT_STI}
                  className="text-[12px] text-fg underline underline-offset-2 hover:text-fg-muted"
                >
                  Sett opp autentikator
                </a>
              </section>

              <section className="flex flex-col gap-2 border-border border-t pt-3">
                <h2 className="text-label text-fg">Logg inn med magiclink</h2>
                <p className="text-[12px] text-fg-muted leading-relaxed">
                  {lenkeSendt
                    ? `Lenke sendt til ${email}. Åpne den på denne enheten. Har du ikke app, går du videre til oppsett.`
                    : 'Vi sender en innloggingslenke til kontoen. Uten bundet app åpner lenken oppsettet.'}
                </p>
                <StatefulButton
                  type="button"
                  state={magicBusy}
                  className="w-full"
                  loadingText="Sender lenke…"
                  successText="Sendt"
                  errorText="Prøv igjen"
                  icon={<Mail size={15} />}
                  onClick={() => void onMagicLinkPaaNytt()}
                >
                  Logg inn med magiclink
                </StatefulButton>
              </section>

              <section className="flex flex-col gap-2 border-border border-t pt-3">
                <h2 className="text-label text-fg">Bytt konto</h2>
                <button
                  type="button"
                  onClick={() => void byttKonto()}
                  className="inline-flex h-control w-full items-center justify-center rounded-control border border-border px-3 text-fg text-label hover:bg-surface-2"
                >
                  Bytt konto
                </button>
              </section>

              {error && <p className="text-[12px] text-danger">{error}</p>}
            </div>
          </div>
        )}

        {demoHint}
      </div>
    </main>
  );
}
