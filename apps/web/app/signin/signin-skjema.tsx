'use client';

import { Lock, Mail, ShieldCheck, StatefulButton } from '@endwise/ui';
import Image from 'next/image';
import Link from 'next/link';
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { authClient, signIn } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { Field, INPUT, PassordFelt } from '../_auth/felter';

/**
 * F1-02 / F1-11 — Innlogging i TO STEG: passord → engangskode på e-post.
 *
 * Steg 2 er ikke en opsjon brukeren kan hoppe over. Better-Auth svarer
 * `twoFactorRedirect: true` i stedet for en sesjon når kontoen har 2FA på, og
 * da FINNES det ingen innlogget tilstand å gå videre fra — skjermen kan ikke
 * «glemme» å vise kodefeltet, for det er ingenting bak den å vise.
 *
 * **Ingen «husk denne enheten».** `trustDevice` sendes aldri (F1-11: ingen
 * bypass). Det er derfor knappen ikke finnes her — en avkrysningsboks vi
 * bevisst ignorerer, ville vært verre enn ingen boks.
 *
 * Sesjons-ID-en roteres av two-factor-pluginen når koden godtas (CWE-384) —
 * server-side, ikke noe denne siden gjør eller kan slå av.
 */
type Step = 'credentials' | 'otp';

/** Kodens levetid før «Send ny kode» blir tilgjengelig igjen. */
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Better-Auth svarer på engelsk, og de tre feilene ser like ut for brukeren
 * selv om de betyr helt forskjellige ting. Uten skillet sitter man og prøver et
 * passord som var riktig hele tiden.
 *
 *   429 INVALID …            → for mange forsøk (passordet kan ha vært riktig)
 *   400 INVALID_EMAIL        → e-postfeltet er ikke en gyldig adresse
 *   401 INVALID_EMAIL_OR_…   → feil e-post ELLER feil passord
 */
function feilmelding(res: {
  error?: { status?: number; code?: string; message?: string } | null;
}): string {
  if (res.error?.status === 429) {
    return 'For mange innloggingsforsøk. Vent ett minutt og prøv igjen — passordet kan godt ha vært riktig.';
  }
  if (res.error?.code === 'INVALID_EMAIL') {
    return 'E-postadressen ser ikke gyldig ut. Sjekk at hele adressen er med.';
  }
  if (res.error?.status === 401) {
    // Autofyll nevnes med vilje: et lagret gammelt passord ser identisk ut med
    // et riktig ett, siden feltet uansett bare viser prikker.
    return 'Feil e-post eller passord. Skriv passordet for hånd hvis nettleseren fylte det ut for deg.';
  }
  return res.error?.message ?? 'Innlogging feilet';
}

export function SignInSkjema({ demoHint }: { demoHint: ReactNode }) {
  const utils = trpc.useUtils();
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === 'otp') codeRef.current?.focus();
  }, [step]);

  /**
   * Felles landing: sett aktiv organisasjon (tenant) → tRPC-context får tenant
   * + rolle → spør serveren HVOR denne personen skal begynne dagen.
   *
   * ── F1-14: landing følger JOBBFUNKSJON ────────────────────────────────
   *   leder / selger → /dashboard    support → /innboks    mekaniker → /min-dag
   *
   * ⚠️ Målet hentes fra `session.me` (`landing`), ikke regnet ut her. Regelen
   * avhenger av mekanikerprofil og lagret funksjon — ting klienten ikke kjenner
   * sikkert — og en landingsregel som finnes to steder blir før eller siden to
   * ulike regler.
   *
   * ⚠️ Og det er en LANDING, ikke en lås: etterpå kan man navigere fritt
   * innenfor sin egen tilgang. Den eneste ekte låsen er «ren mekaniker», som
   * `(app)/layout.tsx` håndhever fordi mekanikerflaten er hele appen for dem.
   *
   * Feiler oppslaget, går vi til /dashboard som før. En treg eller nede API
   * skal ikke stoppe en vellykket innlogging.
   */
  async function finishSignIn() {
    const orgs = await authClient.organization.list();
    const first = orgs.data?.[0];
    if (first) await authClient.organization.setActive({ organizationId: first.id });
    setBusy('success');

    /**
     * ⛔ F1-11 — TVUNGEN ENROLLMENT.
     *
     * Krever rollen 2FA og brukeren ikke har satt det opp, svarer serveren
     * `TWO_FACTOR_REQUIRED` på ALLE tRPC-ruter — også denne. Da skal hen til
     * oppsett, ikke til dashbordet og ikke tilbake til innlogging.
     *
     * ⚠️ Falt vi tilbake til `/dashboard` her (som før), ville brukeren landet
     * på en side der hvert eneste datakall feiler, uten å få vite hvorfor.
     */
    const landing = await utils.session.me
      .fetch()
      .then((me) => me.landing)
      .catch((error: unknown) => {
        const melding = error instanceof Error ? error.message : String(error);
        return melding.includes('TWO_FACTOR_REQUIRED') ? '/2fa-oppsett' : '/dashboard';
      });
    // session.me.landing er /oppstart for eier som ikke har fullført veiviseren.

    /**
     * ⚠️ **HARD navigasjon, ikke `router.push`. Dette var DOBBEL-LOGIN-BUGEN.**
     *
     * `router.push` er en myk klientnavigasjon: dokumentet gjenbrukes, og
     * `(app)/layout.tsx` monteres inn i en app som allerede kjører. Der kalles
     * `useSession()` for aller første gang — `/signin` bruker den ikke — så
     * Better-Auths sesjons-store er UINITIALISERT i det øyeblikket guarden
     * leser den. Ett render med «ingen bruker» er nok:
     * `router.replace('/signin')` fyrer, og du er tilbake på innlogging med en
     * helt gyldig sesjon i cookien.
     *
     * Andre forsøk virket fordi storen da var fylt av hentingen fra første
     * forsøk. Derav «må logge inn to ganger».
     *
     * En full sidelast fjerner hele klassen: cookien er med på aller første
     * request, appen booter én gang med en ekte sesjon, og ingen klient-cache
     * kan være foreldet. Kontekstbytteren gjør allerede nøyaktig dette, av
     * samme grunn (`context-switcher.tsx`).
     */
    window.location.assign(landing ?? '/dashboard');
  }

  async function sendCode(): Promise<boolean> {
    // Aldri trustDevice. Se filkommentaren.
    const res = await authClient.twoFactor.sendOtp();
    if (res.error) {
      setError(res.error.message ?? 'Kunne ikke sende engangskode');
      return false;
    }
    setCooldown(RESEND_COOLDOWN_SECONDS);
    return true;
  }

  async function onCredentials(e: FormEvent) {
    e.preventDefault();
    setBusy('loading');
    setError(null);
    setNotice(null);

    /**
     * ⚠️ **TRIM. Dette er ikke pynt — det var den faktiske innloggingsfeilen
     * 07.08.2026.**
     *
     * Et passord som limes inn fra en melding, et terminalvindu eller et
     * dokument får nesten alltid med seg et mellomrom eller et linjeskift på
     * slutten. Feltet viser prikker, så det er **usynlig**. Better-Auth svarer
     * da `401 Invalid email or password` — nøyaktig samme melding som ved feil
     * passord — og brukeren sitter og skriver et passord som var riktig.
     *
     * Mellomrom i ytterkant av et passord er et lime-artefakt, aldri et valg.
     * Samme for e-posten, som ellers gir en enda mer forvirrende `400 Invalid
     * email` (feltet ser jo helt riktig ut).
     *
     * Merk: kontoopprettelse må trimme likt. Eneste vei inn i dag er seeden,
     * som bruker literaler uten mellomrom — men står det her, blir det ikke
     * glemt når invitasjonsflyten (F1-10) bygges.
     */
    const res = await signIn.email({ email: email.trim(), password: password.trim() });
    if (res.error) {
      setError(feilmelding(res));
      setBusy('error');
      return;
    }

    // 2FA på kontoen → ingen sesjon ennå, bare en billett til steg 2.
    const needsTwoFactor =
      (res.data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect === true;

    if (!needsTwoFactor) {
      await finishSignIn();
      return;
    }

    if (await sendCode()) {
      setStep('otp');
      /**
       * ⚠️ INGEN notis her (fjernet 20.08.2026). Overskriften på steg 2 sier
       * allerede «Vi sendte en 6-sifret kode til {e-post}» — en liten linje
       * under knappen som gjentar det samme, er den samme opplysningen to
       * ganger på én skjerm.
       *
       * Notisen beholdes for «Send ny kode», der den sier noe NYTT: at den
       * handlingen du nettopp gjorde faktisk skjedde. Se `onResend`.
       */
      setBusy('idle');
    } else {
      setBusy('error');
    }
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    setBusy('loading');
    setError(null);

    const res = await authClient.twoFactor.verifyOtp({ code: code.trim() });
    if (res.error) {
      setError(res.error.message ?? 'Feil eller utløpt kode');
      setBusy('error');
      setCode('');
      codeRef.current?.focus();
      return;
    }
    await finishSignIn();
  }

  async function onResend() {
    setError(null);
    setNotice(null);
    if (await sendCode()) setNotice('Ny engangskode sendt.');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 text-fg">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image src="/logo/logo.svg" alt="Endwise" width={44} height={44} priority />
          <h1 className="text-title text-fg">
            {step === 'credentials' ? 'Logg inn på Endwise' : 'Bekreft med engangskode'}
          </h1>
          <p className="text-center text-body text-fg-muted">
            {step === 'credentials'
              ? 'Passord først, deretter en engangskode på e-post.'
              : `Vi sendte en 6-sifret kode til ${email}. Den varer i noen minutter.`}
          </p>
        </div>

        {step === 'credentials' ? (
          <form
            onSubmit={onCredentials}
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
              {/* F1-18 — avsløringsknappen gjør lime-artefaktet synlig; se
                  `_auth/felter.tsx` for hvorfor det er en sikkerhetsdetalj og
                  ikke pynt. */}
              <PassordFelt
                id="signin-password"
                label="Passord"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
              />
              {error && <p className="text-[12px] text-danger">{error}</p>}
              {/* F1-15 — veien ut for den som ikke kommer inn. Sto tomt her
                  fram til 22.08.2026: `/min-dag/meg` henviste til «Glemt
                  passord» mens lenka ikke fantes noe sted. */}
              <p className="text-[12px]">
                <Link
                  href="/glemt-passord"
                  className="text-fg-muted underline underline-offset-2 transition-colors hover:text-fg"
                >
                  Glemt passord?
                </Link>
              </p>
            </div>
            <div className="px-1.5 pt-1 pb-1">
              <StatefulButton
                type="submit"
                state={busy}
                className="w-full"
                loadingText="Logger inn…"
                successText="Logget inn"
                errorText="Prøv igjen"
                icon={<Lock size={15} />}
              >
                Logg inn
              </StatefulButton>
            </div>
          </form>
        ) : (
          <form
            onSubmit={onVerify}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-[5px]"
          >
            <div className="flex flex-col gap-3 rounded-lg bg-inset p-4">
              <Field id="signin-otp" label="Engangskode">
                <input
                  id="signin-otp"
                  ref={codeRef}
                  // `one-time-code` lar iOS/Android tilby koden fra varselet.
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(ev) => setCode(ev.target.value.replace(/\D/g, ''))}
                  className={`${INPUT} text-center font-mono text-[16px] tracking-[0.5em] tabular-nums`}
                  placeholder="••••••"
                  aria-describedby="otp-help"
                />
              </Field>
              {notice && !error && <p className="text-[12px] text-fg-muted">{notice}</p>}
              {error && <p className="text-[12px] text-danger">{error}</p>}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={onResend}
                  disabled={cooldown > 0}
                  className="text-[12px] text-fg-muted underline underline-offset-2 transition-colors hover:text-fg disabled:cursor-not-allowed disabled:text-fg-muted disabled:no-underline disabled:opacity-60"
                >
                  {cooldown > 0 ? `Send ny kode om ${cooldown} s` : 'Send ny kode'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('credentials');
                    setCode('');
                    setError(null);
                    setNotice(null);
                    setBusy('idle');
                  }}
                  className="text-[12px] text-fg-muted transition-colors hover:text-fg"
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

        {step === 'otp' ? (
          <p
            id="otp-help"
            className="mt-4 flex items-start gap-2 text-center text-[12px] text-fg-muted leading-relaxed"
          >
            <Mail size={13} className="mt-px shrink-0" />
            <span className="text-left">
              Koden gjelder kun denne innloggingen. Endwise har ingen «husk denne enheten» — hver
              innlogging for forhandler og admin krever ny kode.
            </span>
          </p>
        ) : (
          demoHint
        )}
      </div>
    </main>
  );
}
