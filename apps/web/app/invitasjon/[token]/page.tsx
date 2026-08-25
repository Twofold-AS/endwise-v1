'use client';

import { Lock, Mail, ShieldCheck, StatefulButton } from '@endwise/ui';
import Image from 'next/image';
import { use, useEffect, useRef, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { Field, INPUT, PassordFelt } from '../../_auth/felter';
import { destinasjonEtterInvite, krevRevokeAndreSesjoner, trengerKodeSteg } from '../_landing';

/**
 * F1-10 / F5-26 — INVITEE-SIDEN. Første møte med Endwise.
 *
 * ── ⚠️ Hvorfor denne ligger UTENFOR `(app)` ──────────────────────────────
 * Den som åpner lenka har ingen konto, ingen sesjon og ingen forhandler. Hele
 * `(app)` henter data over tRPC, som krever begge deler — og fra F1-11 også
 * fullført 2FA. Denne siden snakker derfor kun med to offentlige endepunkter:
 * `/invitasjoner/*` (vår egen) og `/api/auth/*` (Better-Auth).
 *
 * ── Kjeden (samme skall, første klikk) ──────────────────────────────────
 *   A. HER: sett/bytt passord
 *   B. 2FA hvis rollen krever det — kode i SAMME chrome, ikke «logg inn igjen»
 *   C. Eier: `/oppstart`. Ansatt: `session.me.landing`.
 *
 * ⛔ Fersk invitee (`kreverPassord`) sendes ALDRI til `/signin`.
 * ⛔ Hard navigasjon (`location.assign`) — myk klientnavigasjon er dobbel-login-bugen.
 * Aktiv organisasjon settes FØR navigasjon, ellers er dashbordet tomt til
 * neste innlogging.
 *
 * ── Chrome ───────────────────────────────────────────────────────────────
 * Samme skall som `/signin` og `/2fa-oppsett`: sentrert `max-w-sm`, logo
 * 44×44, kort `p-[5px]` + inset, `Field` / `PassordFelt` / `StatefulButton`.
 * Ingen ny pakke. Ingen butikk- eller SMS-modul. Ingen egen admin-fane.
 */
type Invitasjon = {
  gyldig: true;
  epost: string;
  funksjon: string | null;
  kind: 'staff' | 'owner' | 'platform';
  platformLevel?: 'administrator' | 'support' | null;
  forhandler: string;
  utloper: string;
  harKonto: boolean;
  kreverPassord: boolean;
};

const FUNKSJONSTEKST: Record<string, string> = {
  selger: 'selger',
  support: 'support',
  mekaniker: 'mekaniker',
  leder: 'eier',
};

export default function InvitasjonPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const utils = trpc.useUtils();

  const [inv, setInv] = useState<Invitasjon | null>(null);
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState<string | null>(null);
  const [navn, setNavn] = useState('');
  const [passord, setPassord] = useState('');
  const [kode, setKode] = useState('');
  const [sender, setSender] = useState(false);
  const [ferdig, setFerdig] = useState(false);
  const [steg, setSteg] = useState<'skjema' | 'kode'>('skjema');
  const codeRef = useRef<HTMLInputElement>(null);
  const otpFerdigRef = useRef(false);

  useEffect(() => {
    let avbrutt = false;
    void (async () => {
      try {
        // Flertall: API-et. Entall `/invitasjon/:token` er DENNE siden.
        const res = await fetch(`/invitasjoner/${encodeURIComponent(token)}`);
        const data = (await res.json().catch(() => null)) as
          | (Invitasjon & { gyldig?: boolean; grunn?: string })
          | { gyldig?: boolean; grunn?: string }
          | null;
        if (avbrutt) return;
        if (!res.ok || !data?.gyldig) {
          setFeil(
            (typeof data?.grunn === 'string' && data.grunn) ||
              (res.ok
                ? 'Invitasjonen er ugyldig, brukt eller utløpt.'
                : 'Klarte ikke hente invitasjonen. Prøv igjen.'),
          );
        } else {
          setInv(data as Invitasjon);
        }
      } catch {
        if (!avbrutt) setFeil('Klarte ikke hente invitasjonen. Prøv igjen.');
      } finally {
        if (!avbrutt) setLaster(false);
      }
    })();
    return () => {
      avbrutt = true;
    };
  }, [token]);

  useEffect(() => {
    if (steg === 'kode') codeRef.current?.focus();
  }, [steg]);

  async function aktiverOrg() {
    const orgs = await authClient.organization.list();
    const platform = orgs.data?.find((o) => o.slug === 'endwise');
    const first = platform ?? orgs.data?.[0];
    if (first) await authClient.organization.setActive({ organizationId: first.id });
  }

  async function land(kind: Invitasjon['kind']) {
    // CWE-613: sesjonen etter passord+OTP erstatter gamle sesjoner.
    // Token logges ikke. Feiler revoke, feiler lukket — gamle sesjoner
    // skal ikke bli stille igjen. destinasjonEtterInvite rører 2FA-feil.
    await krevRevokeAndreSesjoner(() => authClient.revokeOtherSessions(), 'invite');
    await aktiverOrg();
    try {
      const me = await utils.session.me.fetch();
      window.location.assign(destinasjonEtterInvite(kind, me.landing));
    } catch (error) {
      const feil = error instanceof Error ? error.message : String(error);
      window.location.assign(destinasjonEtterInvite(kind, null, feil));
    }
  }

  async function startKodeSteg(passordForEnable: string) {
    const enable = await authClient.twoFactor.enable({ password: passordForEnable });
    if (enable.error && !/already/i.test(enable.error.message ?? '')) {
      setFeil(enable.error.message ?? 'Kunne ikke starte tofaktor.');
      return false;
    }
    const sendt = await authClient.twoFactor.sendOtp();
    if (sendt.error) {
      setFeil(sendt.error.message ?? 'Kunne ikke sende engangskode.');
      return false;
    }
    setSteg('kode');
    return true;
  }

  async function godta(event: React.FormEvent) {
    event.preventDefault();
    if (!inv) return;
    setFeil(null);
    setSender(true);
    try {
      const trimmedPassord = passord.trim();
      const res = await fetch('/invitasjoner/godta', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token,
          navn: navn.trim(),
          ...(inv.kreverPassord ? { passord: trimmedPassord } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeil(data?.error ?? 'Noe gikk galt.');
        return;
      }

      setFerdig(true);

      if (!inv.kreverPassord) {
        window.location.assign('/signin');
        return;
      }

      const inn = await authClient.signIn.email({
        email: inv.epost,
        password: trimmedPassord,
      });
      if (inn.error) {
        setFeil(inn.error.message ?? 'Klarte ikke logge inn. Prøv igjen fra denne siden.');
        setFerdig(false);
        return;
      }

      const redirect =
        (inn.data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect === true;
      if (trengerKodeSteg({ twoFactorRedirect: redirect })) {
        const sendt = await authClient.twoFactor.sendOtp();
        if (sendt.error) {
          setFeil(sendt.error.message ?? 'Kunne ikke sende engangskode.');
          setFerdig(false);
          return;
        }
        setSteg('kode');
        setFerdig(false);
        return;
      }

      if (await startKodeSteg(trimmedPassord)) {
        setFerdig(false);
        return;
      }
      setFerdig(false);
    } catch (error) {
      setFeil((error as Error).message);
      setFerdig(false);
    } finally {
      setSender(false);
    }
  }

  async function bekreftKode(event: React.FormEvent) {
    event.preventDefault();
    if (!inv) return;
    setFeil(null);
    setSender(true);
    try {
      if (!otpFerdigRef.current) {
        const res = await authClient.twoFactor.verifyOtp({ code: kode.trim() });
        if (res.error) {
          setFeil(res.error.message ?? 'Feil kode.');
          setKode('');
          codeRef.current?.focus();
          return;
        }
        otpFerdigRef.current = true;
      }
      await land(inv.kind);
    } catch (error) {
      const melding = error instanceof Error ? error.message : String(error);
      if (trengerKodeSteg({ feil: melding })) {
        setFeil('Tofaktor kreves. Skriv koden vi sendte.');
        return;
      }
      setFeil(melding);
    } finally {
      setSender(false);
    }
  }

  const rolle =
    inv?.kind === 'owner'
      ? 'eier'
      : inv?.kind === 'platform'
        ? inv.platformLevel === 'administrator'
          ? 'administrator'
          : 'support'
        : (FUNKSJONSTEKST[inv?.funksjon ?? ''] ?? inv?.funksjon);
  const tittel = inv
    ? steg === 'kode'
      ? 'Bekreft med engangskode'
      : inv.kind === 'platform'
        ? 'Velkommen til Endwise'
        : `Velkommen til ${inv.forhandler}`
    : laster
      ? 'Invitasjon'
      : 'Invitasjonen virker ikke';
  const undertekst = inv
    ? steg === 'kode'
      ? `Vi sendte en 6-sifret kode til ${inv.epost}. Den varer i noen minutter.`
      : inv.kind === 'platform'
        ? inv.platformLevel === 'administrator'
          ? `Du er invitert til Endwise-support som administrator. Kontoen knyttes til ${inv.epost}.`
          : `Du er invitert til Endwise-support. Kontoen knyttes til ${inv.epost}.`
        : inv.kind === 'owner'
          ? `Du er invitert som eier. Kontoen knyttes til ${inv.epost}.`
          : `Du er invitert som ${rolle}. Kontoen knyttes til ${inv.epost}.`
    : laster
      ? null
      : 'Lenker er personlige, kan brukes én gang, og utløper etter sju dager. Be om en ny hvis du trenger det.';

  const knappetilstand = ferdig ? 'success' : sender ? 'loading' : 'idle';

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 text-fg">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image src="/logo/logo.svg" alt="Endwise" width={44} height={44} priority />
          <h1 className="text-title text-fg">{tittel}</h1>
          {undertekst ? <p className="text-center text-body text-fg-muted">{undertekst}</p> : null}
        </div>

        {laster ? (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-[5px]">
            <div className="flex flex-col gap-3 rounded-lg bg-inset p-4">
              <p className="text-[12px] text-fg-muted">Henter invitasjonen…</p>
            </div>
            <div className="px-1.5 pt-1 pb-1">
              <StatefulButton
                type="button"
                state="loading"
                className="w-full"
                loadingText="Henter invitasjonen…"
                successText="Opprettet"
                icon={<Lock size={15} />}
                disabled
              >
                Fortsett
              </StatefulButton>
            </div>
          </div>
        ) : null}

        {!laster && !inv ? (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-[5px]">
            <div className="flex flex-col gap-3 rounded-lg bg-inset p-4">
              {feil ? <p className="text-[12px] text-fg-muted leading-relaxed">{feil}</p> : null}
            </div>
          </div>
        ) : null}

        {inv && steg === 'skjema' ? (
          <form
            onSubmit={(e) => void godta(e)}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-[5px]"
          >
            <div className="flex flex-col gap-3 rounded-lg bg-inset p-4">
              <Field id="inv-navn" label="Hva heter du?">
                <input
                  id="inv-navn"
                  autoComplete="name"
                  required
                  minLength={2}
                  value={navn}
                  onChange={(e) => setNavn(e.target.value)}
                  className={INPUT}
                />
              </Field>

              {inv.kreverPassord ? (
                <PassordFelt
                  id="inv-passord"
                  label={inv.harKonto ? 'Sett eller bytt passord' : 'Velg et passord'}
                  value={passord}
                  onChange={setPassord}
                  autoComplete="new-password"
                  minLength={12}
                  beskrivelse="Minst 12 tegn. Etterpå setter du opp tofaktor — det er påkrevd."
                />
              ) : (
                <p className="text-[12px] text-fg-muted leading-relaxed">
                  Du har allerede en Endwise-konto på denne e-posten. Vi legger deg til hos{' '}
                  {inv.forhandler} — logg inn med passordet du har fra før.
                </p>
              )}

              {feil ? (
                <p role="alert" className="text-[12px] text-danger">
                  {feil}
                </p>
              ) : null}
            </div>
            <div className="px-1.5 pt-1 pb-1">
              <StatefulButton
                type="submit"
                state={knappetilstand}
                className="w-full"
                loadingText="Oppretter …"
                successText="Opprettet"
                errorText="Prøv igjen"
                icon={<Lock size={15} />}
                disabled={
                  sender ||
                  ferdig ||
                  navn.trim().length < 2 ||
                  (inv.kreverPassord && passord.length < 12)
                }
              >
                Fortsett
              </StatefulButton>
            </div>
          </form>
        ) : null}

        {inv && steg === 'kode' ? (
          <form
            onSubmit={(e) => void bekreftKode(e)}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-[5px]"
          >
            <div className="flex flex-col gap-3 rounded-lg bg-inset p-4">
              <Field id="inv-otp" label="Engangskode">
                <input
                  id="inv-otp"
                  ref={codeRef}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={kode}
                  onChange={(e) => setKode(e.target.value.replace(/\D/g, ''))}
                  className={`${INPUT} text-center font-mono text-[16px] tracking-[0.5em] tabular-nums`}
                  placeholder="••••••"
                />
              </Field>
              {feil ? (
                <p role="alert" className="text-[12px] text-danger">
                  {feil}
                </p>
              ) : null}
              <p className="flex items-start gap-2 text-[12px] text-fg-muted leading-relaxed">
                <Mail size={13} className="mt-px shrink-0" />
                <span>
                  Vi har sendt en engangskode til e-posten din. Sjekk søppelposten om den ikke
                  dukker opp.
                </span>
              </p>
            </div>
            <div className="px-1.5 pt-1 pb-1">
              <StatefulButton
                type="submit"
                state={sender ? 'loading' : 'idle'}
                className="w-full"
                loadingText="Bekrefter …"
                successText="Bekreftet"
                errorText="Feil kode"
                icon={<ShieldCheck size={15} />}
                disabled={sender || kode.length < 6}
              >
                Bekreft
              </StatefulButton>
            </div>
          </form>
        ) : null}
      </div>
    </main>
  );
}
