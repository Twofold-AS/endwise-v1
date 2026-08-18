'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { authClient } from '@/lib/auth-client';

/**
 * F1-11 — TVUNGEN 2FA-ENROLLMENT.
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
 *   1. `enable({ password })`   → lager hemmeligheten. Flagget settes IKKE ennå.
 *   2. `sendOtp()`              → koden sendes (i dev: til api-loggen).
 *   3. `verifyOtp({ code })`    → NÅ settes `twoFactorEnabled = true`.
 *   4. `revokeOtherSessions()`  → ⛔ se under.
 *
 * ⚠️ **Steg 4 er nå ET EKSTRA LAG, ikke selve sperren.** Fra 16.08.2026 river
 * en databasetrigger (`endwise_2fa_session_cutoff`, migrasjon `0010`) alle
 * sesjoner i det `two_factor_enabled` settes — uansett hvor det skjer, også ved
 * et rått `UPDATE` i basen. Den er sperren.
 *
 * Kallet beholdes likevel: det koster ett API-kall, og det dekker et miljø der
 * migrasjonene skulle ligge etter. Feiler det, er det ikke lenger kritisk —
 * derfor `.catch()` med en advarsel i stedet for en blokkering.
 *
 * ⚠️ **Bevisst UDESIGNET.** Dette er en sikkerhetsfiks, ikke UI-arbeid. Siden
 * bruker samme nakne stil som `/signin` og skal styles sammen med den senere.
 */
export default function ToFaktorOppsettPage() {
  const router = useRouter();
  const [steg, setSteg] = useState<'passord' | 'kode' | 'ferdig'>('passord');
  const [passord, setPassord] = useState('');
  const [kode, setKode] = useState('');
  const [feil, setFeil] = useState<string | null>(null);
  const [venter, setVenter] = useState(false);

  async function startOppsett(event: FormEvent) {
    event.preventDefault();
    setFeil(null);
    setVenter(true);
    try {
      // Feiler denne med «allerede aktivert», er hemmeligheten alt laget —
      // da går vi rett videre til koden i stedet for å stoppe brukeren.
      const res = await authClient.twoFactor.enable({ password: passord });
      if (res.error && !/already/i.test(res.error.message ?? '')) {
        setFeil(res.error.message ?? 'Kunne ikke starte oppsettet.');
        return;
      }
      const sendt = await authClient.twoFactor.sendOtp();
      if (sendt.error) {
        setFeil(sendt.error.message ?? 'Kunne ikke sende engangskode.');
        return;
      }
      setSteg('kode');
    } catch (error) {
      setFeil((error as Error).message);
    } finally {
      setVenter(false);
    }
  }

  async function bekreft(event: FormEvent) {
    event.preventDefault();
    setFeil(null);
    setVenter(true);
    try {
      const res = await authClient.twoFactor.verifyOtp({ code: kode.trim() });
      if (res.error) {
        setFeil(res.error.message ?? 'Feil kode.');
        return;
      }

      // ⛔ Se filhodet, steg 4. Gamle passord-sesjoner må dø her.
      await authClient.revokeOtherSessions().catch(() => {
        // Feiler denne, er det ikke verdt å blokkere brukeren — men det skal
        // være synlig at ryddingen ikke gikk.
        console.warn('[2fa] revokeOtherSessions feilet — gamle sesjoner kan leve videre');
      });

      setSteg('ferdig');
      // Hard navigasjon: samme lærdom som dobbel-login-bugen. Klient-storen
      // har en utdatert sesjon, og en myk navigasjon ville lest den.
      window.location.assign('/dashboard');
    } catch (error) {
      setFeil((error as Error).message);
    } finally {
      setVenter(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg text-fg">
      <div className="mx-auto flex w-full max-w-[420px] flex-col gap-6 px-6 py-16 sm:py-24">
        <div className="flex flex-col gap-2">
          <h1 className="font-semibold text-fg text-xl tracking-tight">Sett opp tofaktor</h1>
          <p className="text-body text-fg-muted leading-relaxed">
            Rollen din krever tofaktor-autentisering. Du må sette det opp før du kommer videre.
          </p>
        </div>

        {steg === 'passord' ? (
          <form onSubmit={startOppsett} className="flex flex-col gap-3">
            <label htmlFor="tfa-passord" className="text-label text-fg">
              Bekreft passordet ditt
            </label>
            <input
              id="tfa-passord"
              type="password"
              autoComplete="current-password"
              value={passord}
              onChange={(e) => setPassord(e.target.value)}
              required
              className="h-control rounded-control border border-border bg-bg px-3 text-body text-fg outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
            <button
              type="submit"
              disabled={venter || !passord}
              className="inline-flex h-control items-center justify-center rounded-control bg-fg px-4 text-label text-bg disabled:opacity-40"
            >
              {venter ? 'Sender kode …' : 'Send meg en engangskode'}
            </button>
          </form>
        ) : null}

        {steg === 'kode' ? (
          <form onSubmit={bekreft} className="flex flex-col gap-3">
            <label htmlFor="tfa-kode" className="text-label text-fg">
              Engangskode
            </label>
            <input
              id="tfa-kode"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={kode}
              onChange={(e) => setKode(e.target.value)}
              required
              className="h-control rounded-control border border-border bg-bg px-3 font-mono text-body text-fg outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
            <p className="text-[12px] text-fg-muted leading-relaxed">
              Koden er sendt til e-postadressen din. Kjører du lokalt uten Resend, står den i
              api-loggen i terminalen.
            </p>
            <button
              type="submit"
              disabled={venter || !kode.trim()}
              className="inline-flex h-control items-center justify-center rounded-control bg-fg px-4 text-label text-bg disabled:opacity-40"
            >
              {venter ? 'Bekrefter …' : 'Bekreft og fullfør'}
            </button>
          </form>
        ) : null}

        {feil ? (
          <p role="alert" className="text-body text-destructive">
            {feil}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => {
            void authClient.signOut().finally(() => router.replace('/signin' as Route));
          }}
          className="self-start text-[12px] text-fg-muted underline underline-offset-2 hover:text-fg"
        >
          Logg ut
        </button>
      </div>
    </main>
  );
}
