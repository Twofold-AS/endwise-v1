'use client';

import { KREDENTIAL_MUTASJON_GENERISK_MELDING } from '@endwise/auth/bytt-passord';
import {
  etter2faBekreftet,
  etter2faKodeBekreftet,
  fortsettEtter2faKvittering,
  KODER_FILNAVN,
  kanFullforeKoder,
  koderSomTekstfil,
  plukkBackupKoder,
  slaaAv2faKall,
  validerSlaaAv2fa,
} from '@endwise/auth/to-faktor-oppsett';
import {
  ClipboardList,
  Copy,
  Download,
  Lock,
  Mail,
  ShieldCheck,
  StatefulButton,
} from '@endwise/ui';
import type { Route } from 'next';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { authClient, useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { Field, INPUT, PassordFelt } from '../_auth/felter';

/**
 * F1-11 / F1-21 / F1-22 / F1-23 / F1-25 — TVUNGEN 2FA-ENROLLMENT, stylet
 * som `/signin`. Gjenopprettingskoder vises én gang. Slå-av krever passord.
 *
 * ── ⚠️ Hvorfor denne ruta ligger UTENFOR `(app)` ─────────────────────────
 * Fra 12.08.2026 håndheves 2FA server-side: en `dealer_admin` / `dealer_staff` /
 * `endwise_admin` uten 2FA får `TWO_FACTOR_REQUIRED` på hver eneste tRPC-rute.
 * Hele forhandlerpanelet henter data over tRPC, så **det finnes ikke en flate
 * inne i `(app)` hen kan nå** — heller ikke innstillingssiden der 2FA ville blitt
 * skrudd på. Uten denne siden er fiksen en utestengelse, ikke en sikring.
 *
 * Denne siden snakker derfor KUN med Better-Auth (`/api/auth/*`), som med vilje
 * står utenfor 2FA-gaten. Det er trygt: hvert steg krever noe hen allerede måtte
 * bevise — `enable` krever passordet på nytt, og flagget `twoFactorEnabled`
 * settes først når engangskoden er verifisert.
 *
 * ── Rekkefølgen, og hvorfor den er slik ──────────────────────────────────
 *   1. `enable({ password })`   → lager hemmeligheten OG backupCodes. Flagget
 *                                 settes IKKE ennå. Kodene fanges her.
 *   2. `sendOtp()`              → koden sendes (i dev: til api-loggen).
 *   3. `verifyOtp({ code })`    → NÅ settes `twoFactorEnabled = true`.
 *   4. `revokeOtherSessions()`  → ⛔ se under.
 *   5. `steg = 'koder'`         → F1-21: vis kodene. Kan ikke gå videre uten
 *                                 nedlasting eller kopiering + bekreftelse.
 *   6. `steg = 'ferdig'`        → F1-23: vis kvittering. Ikke naviger ennå.
 *
 * ⚠️ **Steg 4 er nå ET EKSTRA LAG, ikke selve sperren.** Fra 16.08.2026 river
 * en databasetrigger (`endwise_2fa_session_cutoff`, migrasjon `0010`) alle
 * sesjoner i det `two_factor_enabled` settes — uansett hvor det skjer, også ved
 * et rått `UPDATE` i basen. Den er sperren.
 *
 * ── F1-21 ────────────────────────────────────────────────────────────────
 * Better-Auth 1.6.23 returnerer `backupCodes` fra `enable`. Vi later ikke som
 * om de må genereres etterpå. De vises én gang i minnet; lukker du fanen
 * er de borte (lagret kryptert, ikke i klartekst).
 *
 * ── F1-23 ────────────────────────────────────────────────────────────────
 * Tidligere kalte denne sida `window.location.assign('/dashboard')` i samme
 * tick som `steg = 'ferdig'`. Tilstanden rakk aldri å rendre. Nå viser vi
 * kodene, deretter kvitteringen, og hard navigasjon skjer først på «Fortsett».
 *
 * ── F1-25 ────────────────────────────────────────────────────────────────
 * Samme byggeklosser som `/signin`: `StatefulButton`, `Field`, `INPUT`,
 * `PassordFelt`. Ingen nye primitiver.
 */
export default function ToFaktorOppsettPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: session } = useSession();
  const [steg, setSteg] = useState<'passord' | 'kode' | 'koder' | 'av' | 'ferdig'>('passord');
  const [passord, setPassord] = useState('');
  const [kode, setKode] = useState('');
  const [koder, setKoder] = useState<string[]>([]);
  const [lastetNed, setLastetNed] = useState(false);
  const [kopiert, setKopiert] = useState(false);
  const [bekreftetLagret, setBekreftetLagret] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);
  const [busy, setBusy] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (koder.length > 0) return;
    if (steg !== 'passord') return;
    if (
      session?.user &&
      'twoFactorEnabled' in session.user &&
      session.user.twoFactorEnabled === true
    ) {
      setSteg('av');
    }
  }, [session, steg, koder.length]);

  async function startOppsett(event: FormEvent) {
    event.preventDefault();
    setFeil(null);
    setBusy('loading');
    try {
      const res = await authClient.twoFactor.enable({ password: passord.trim() });
      if (res.error && !/already/i.test(res.error.message ?? '')) {
        setFeil(res.error.message ?? 'Kunne ikke starte oppsettet.');
        setBusy('error');
        return;
      }
      const hentet = plukkBackupKoder(res.data ?? res);
      if (hentet.length > 0) setKoder(hentet);
      const sendt = await authClient.twoFactor.sendOtp();
      if (sendt.error) {
        setFeil(sendt.error.message ?? 'Kunne ikke sende engangskode.');
        setBusy('error');
        return;
      }
      setBusy('idle');
      setSteg('kode');
    } catch (error) {
      setFeil((error as Error).message);
      setBusy('error');
    }
  }

  async function bekreft(event: FormEvent) {
    event.preventDefault();
    setFeil(null);
    setBusy('loading');
    try {
      const res = await authClient.twoFactor.verifyOtp({ code: kode.trim() });
      if (res.error) {
        setFeil(res.error.message ?? 'Feil kode.');
        setBusy('error');
        setKode('');
        codeRef.current?.focus();
        return;
      }

      await authClient.revokeOtherSessions().catch(() => {
        console.warn('[2fa] revokeOtherSessions feilet — gamle sesjoner kan leve videre');
      });

      const neste = etter2faKodeBekreftet();
      setSteg(neste.steg);
      setBusy('idle');
    } catch (error) {
      setFeil((error as Error).message);
      setBusy('error');
    }
  }

  function lastNedKoder() {
    const blob = new Blob([koderSomTekstfil(koder)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const lenke = document.createElement('a');
    lenke.href = url;
    lenke.download = KODER_FILNAVN;
    lenke.click();
    URL.revokeObjectURL(url);
    setLastetNed(true);
    setFeil(null);
  }

  async function kopierKoder() {
    await navigator.clipboard.writeText(koder.join('\n'));
    setKopiert(true);
    setFeil(null);
  }

  function fullforKoder() {
    if (!kanFullforeKoder({ lastetNed, kopiert, bekreftetLagret })) {
      setFeil('Last ned eller kopier kodene, og bekreft at du har lagret dem.');
      return;
    }
    const neste = etter2faBekreftet();
    setSteg(neste.steg);
    setBusy('success');
  }

  async function slaAv(event: FormEvent) {
    event.preventDefault();
    setFeil(null);
    const sjekk = validerSlaaAv2fa(passord);
    if (!sjekk.ok) {
      setFeil(sjekk.feil);
      setBusy('error');
      return;
    }
    setBusy('loading');
    const res = await authClient.twoFactor.disable(slaaAv2faKall(sjekk));
    if (res.error) {
      setBusy('error');
      setFeil(KREDENTIAL_MUTASJON_GENERISK_MELDING);
      return;
    }
    setBusy('success');
    setPassord('');
    setSteg('passord');
  }

  function fortsett() {
    void utils.session.me
      .fetch()
      .then((me) => {
        const { destinasjon } = fortsettEtter2faKvittering(me.landing);
        window.location.assign(destinasjon);
      })
      .catch(() => {
        const { destinasjon } = fortsettEtter2faKvittering();
        window.location.assign(destinasjon);
      });
  }

  const koderOk = kanFullforeKoder({ lastetNed, kopiert, bekreftetLagret });

  const tittel =
    steg === 'ferdig'
      ? 'Tofaktor er slått på'
      : steg === 'koder'
        ? 'Lagre gjenopprettingskodene'
        : steg === 'kode'
          ? 'Bekreft med engangskode'
          : steg === 'av'
            ? 'Slå av tofaktor'
            : 'Sett opp tofaktor';
  const ingress =
    steg === 'ferdig'
      ? 'Neste innlogging spør om en engangskode på e-post. Det er beviset på at det gikk bra.'
      : steg === 'koder'
        ? 'Kodene vises bare nå. Last dem ned eller kopier dem — uten dem er du utestengt hvis e-posten forsvinner.'
        : steg === 'kode'
          ? 'Vi sendte en 6-sifret kode til e-postadressen din. Den varer i noen minutter.'
          : steg === 'av'
            ? 'En åpen sesjon er ikke nok. Skriv passordet ditt for å slå av tofaktor.'
            : 'Rollen din krever tofaktor-autentisering. Du må sette det opp før du kommer videre.';

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 text-fg">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image src="/logo/logo.svg" alt="Endwise" width={44} height={44} priority />
          <h1 className="text-title text-fg">{tittel}</h1>
          <p className="text-center text-body text-fg-muted">{ingress}</p>
        </div>

        {steg === 'passord' ? (
          <form
            onSubmit={startOppsett}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-[5px]"
          >
            <div className="flex flex-col gap-3 rounded-lg bg-inset p-4">
              <PassordFelt
                id="tfa-passord"
                label="Bekreft passordet ditt"
                value={passord}
                onChange={setPassord}
                autoComplete="current-password"
              />
              {feil && <p className="text-[12px] text-danger">{feil}</p>}
            </div>
            <div className="px-1.5 pt-1 pb-1">
              <StatefulButton
                type="submit"
                state={busy}
                className="w-full"
                loadingText="Sender kode …"
                successText="Sendt"
                errorText="Prøv igjen"
                icon={<Lock size={15} />}
              >
                Send meg en engangskode
              </StatefulButton>
            </div>
          </form>
        ) : null}

        {steg === 'kode' ? (
          <form
            onSubmit={bekreft}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-[5px]"
          >
            <div className="flex flex-col gap-3 rounded-lg bg-inset p-4">
              <Field id="tfa-kode" label="Engangskode">
                <input
                  id="tfa-kode"
                  ref={codeRef}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={kode}
                  onChange={(ev) => setKode(ev.target.value.replace(/\D/g, ''))}
                  className={`${INPUT} text-center font-mono text-[16px] tracking-[0.5em] tabular-nums`}
                  placeholder="••••••"
                />
              </Field>
              {feil && <p className="text-[12px] text-danger">{feil}</p>}
              <p className="flex items-start gap-2 text-[12px] text-fg-muted leading-relaxed">
                <Mail size={13} className="mt-px shrink-0" />
                <span>Kjører du lokalt uten Resend, står koden i api-loggen i terminalen.</span>
              </p>
            </div>
            <div className="px-1.5 pt-1 pb-1">
              <StatefulButton
                type="submit"
                state={busy}
                className="w-full"
                loadingText="Bekrefter …"
                successText="Bekreftet"
                errorText="Feil kode"
                icon={<ShieldCheck size={15} />}
              >
                Bekreft kode
              </StatefulButton>
            </div>
          </form>
        ) : null}

        {steg === 'koder' ? (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-[5px]">
            <div className="flex flex-col gap-3 rounded-lg bg-inset p-4">
              <p className="flex items-start gap-2 text-[12px] text-fg-muted leading-relaxed">
                <ClipboardList size={13} className="mt-px shrink-0" />
                <span>Hver kode kan brukes én gang. Vi viser dem ikke igjen.</span>
              </p>
              <ol className="grid grid-cols-1 gap-1.5 font-mono text-[13px] text-fg tabular-nums">
                {koder.map((kodeTekst) => (
                  <li
                    key={kodeTekst}
                    className="rounded-control border border-border bg-bg px-3 py-1.5"
                  >
                    {kodeTekst}
                  </li>
                ))}
              </ol>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={lastNedKoder}
                  className="inline-flex h-control items-center gap-1.5 rounded-control border border-border px-3 text-fg text-label transition-colors hover:bg-surface-2"
                >
                  <Download size={14} />
                  Last ned
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void kopierKoder();
                  }}
                  className="inline-flex h-control items-center gap-1.5 rounded-control border border-border px-3 text-fg text-label transition-colors hover:bg-surface-2"
                >
                  <Copy size={14} />
                  {kopiert ? 'Kopiert' : 'Kopier'}
                </button>
              </div>
              <label className="flex items-start gap-2 text-[12px] text-fg leading-relaxed">
                <input
                  type="checkbox"
                  checked={bekreftetLagret}
                  onChange={(ev) => setBekreftetLagret(ev.target.checked)}
                  className="mt-0.5"
                />
                <span>Jeg har lagret kodene på et trygt sted utenfor denne maskinen.</span>
              </label>
              {feil && <p className="text-[12px] text-danger">{feil}</p>}
            </div>
            <div className="px-1.5 pt-1 pb-1">
              <button
                type="button"
                onClick={fullforKoder}
                disabled={!koderOk}
                className="inline-flex h-control w-full items-center justify-center rounded-control bg-fg px-4 text-bg text-label disabled:cursor-not-allowed disabled:opacity-50"
              >
                Fullfør oppsett
              </button>
            </div>
          </div>
        ) : null}

        {steg === 'av' ? (
          <form
            onSubmit={slaAv}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-[5px]"
          >
            <div className="flex flex-col gap-3 rounded-lg bg-inset p-4">
              <PassordFelt
                id="tfa-av-passord-oppsett"
                label="Gjeldende passord"
                value={passord}
                onChange={setPassord}
                autoComplete="current-password"
              />
              {feil && <p className="text-[12px] text-danger">{feil}</p>}
            </div>
            <div className="px-1.5 pt-1 pb-1">
              <StatefulButton
                type="submit"
                state={busy}
                className="w-full"
                loadingText="Slår av …"
                successText="Slått av"
                errorText="Prøv igjen"
                icon={<Lock size={15} />}
              >
                Slå av tofaktor
              </StatefulButton>
            </div>
          </form>
        ) : null}

        {steg === 'ferdig' ? (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-[5px]">
            <div className="flex flex-col gap-3 rounded-lg bg-inset p-4">
              <p className="flex items-start gap-2 text-[12px] text-fg-muted leading-relaxed">
                <ShieldCheck size={13} className="mt-px shrink-0" />
                <span>
                  Tofaktor er på. Neste innlogging krever passord og engangskode — det finnes ingen
                  «husk denne enheten».
                </span>
              </p>
            </div>
            <div className="px-1.5 pt-1 pb-1">
              <button
                type="button"
                onClick={fortsett}
                className="inline-flex h-control w-full items-center justify-center rounded-control bg-fg px-4 text-bg text-label"
              >
                Fortsett
              </button>
            </div>
          </div>
        ) : null}

        {steg !== 'ferdig' ? (
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
        ) : null}
      </div>
    </main>
  );
}
