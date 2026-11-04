'use client';

import { Mail, StatefulButton } from '@endwise/ui';
import Image from 'next/image';
import { use, useCallback, useEffect, useRef, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { Field, INPUT } from '../../_auth/felter';

type Invitasjon = {
  gyldig: true;
  epost: string;
  funksjon: string | null;
  kind: 'staff' | 'owner' | 'platform';
  platformLevel?: 'administrator' | 'support' | null;
  forhandler: string;
  utloper: string;
  harKonto: boolean;
  krever2FA?: boolean;
  kreverKode?: boolean;
};

const FUNKSJONSTEKST: Record<string, string> = {
  selger: 'selger',
  support: 'support',
  mekaniker: 'mekaniker',
  leder: 'eier',
};

const CSRF = { 'x-endwise-csrf': '1' } as const;

export default function InvitasjonPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [inv, setInv] = useState<Invitasjon | null>(null);
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState<string | null>(null);
  const [navn, setNavn] = useState('');
  const [kode, setKode] = useState('');
  const [sender, setSender] = useState(false);
  const [kodeMelding, setKodeMelding] = useState<string | null>(null);
  const [steg, setSteg] = useState<'skjema' | 'sendt'>('skjema');
  const [nyKodeVent, setNyKodeVent] = useState(false);
  const autoSendt = useRef(false);

  useEffect(() => {
    let avbrutt = false;
    void (async () => {
      try {
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
          const gyldig = data as Invitasjon;
          setInv(gyldig);
          if (gyldig.kreverKode) {
            history.replaceState(null, '', '/invitasjon');
          }
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

  const sendKode = useCallback(async () => {
    if (!inv) return;
    setFeil(null);
    setNyKodeVent(true);
    try {
      await fetch(`/invitasjoner/${encodeURIComponent(token)}/send-kode`, {
        method: 'POST',
        headers: { ...CSRF },
      });
      setKodeMelding(`Kode sendt til ${inv.epost}.`);
    } catch (error) {
      setFeil(error instanceof Error ? error.message : 'Noe gikk galt.');
    } finally {
      window.setTimeout(() => setNyKodeVent(false), 10_000);
    }
  }, [inv, token]);

  useEffect(() => {
    if (!inv?.kreverKode || autoSendt.current) return;
    autoSendt.current = true;
    void sendKode();
  }, [inv, sendKode]);

  async function godta(event: React.FormEvent) {
    event.preventDefault();
    if (!inv) return;
    setFeil(null);
    setSender(true);
    try {
      const res = await fetch('/invitasjoner/godta', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...CSRF },
        body: JSON.stringify({
          token,
          navn: navn.trim(),
          ...(inv.kreverKode ? { kode: kode.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeil(data?.error ?? 'Noe gikk galt.');
        return;
      }
      const lenke = await authClient.signIn.magicLink({
        email: inv.epost,
        callbackURL: '/signin',
      });
      if (lenke.error) {
        setFeil(lenke.error.message ?? 'Klarte ikke sende innloggingslenke.');
        return;
      }
      setSteg('sendt');
    } catch (error) {
      setFeil(error instanceof Error ? error.message : 'Noe gikk galt.');
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

  const visSkjema = Boolean(inv) && steg === 'skjema';

  const tittel = inv
    ? steg === 'sendt'
      ? 'Sjekk e-posten'
      : inv.kind === 'platform'
        ? 'Velkommen til Endwise'
        : `Velkommen til ${inv.forhandler}`
    : laster
      ? 'Invitasjon'
      : 'Invitasjonen virker ikke';

  const undertekst = inv
    ? steg === 'sendt'
      ? `Innloggingslenke sendt til ${inv.epost}. Åpne lenken for å gå inn. Autentikator kan du slå på senere.`
      : inv.kind === 'platform'
        ? `Du er invitert til Endwise-support. Kontoen knyttes til ${inv.epost}.`
        : `Du er invitert som ${rolle}. Kontoen knyttes til ${inv.epost}.`
    : laster
      ? null
      : 'Lenker er personlige, kan brukes én gang, og utløper etter sju dager.';

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 text-fg">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image src="/logo/logo.svg" alt="Endwise" width={44} height={44} priority />
          <h1 className="text-title text-fg">{tittel}</h1>
          {undertekst ? <p className="text-center text-body text-fg-muted">{undertekst}</p> : null}
        </div>

        {laster ? (
          <div className="rounded-xl border border-border bg-card p-4 text-[12px] text-fg-muted">
            Henter invitasjonen…
          </div>
        ) : null}

        {!laster && !inv ? (
          <div className="rounded-xl border border-border bg-card p-4 text-[12px] text-fg-muted">
            {feil}
          </div>
        ) : null}

        {visSkjema ? (
          <form onSubmit={(e) => void godta(e)} className="flex flex-col gap-3">
            {inv?.kreverKode ? (
              <div className="rounded-xl border border-border bg-card p-[5px]">
                <div className="rounded-lg bg-inset p-4">
                  <Field id="inv-kode" label="Kode">
                    <input
                      id="inv-kode"
                      autoComplete="one-time-code"
                      inputMode="text"
                      required
                      minLength={6}
                      maxLength={12}
                      value={kode}
                      onChange={(e) => setKode(e.target.value.toUpperCase())}
                      className={INPUT}
                    />
                  </Field>
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-border bg-card p-[5px]">
              <div className="rounded-lg bg-inset p-4">
                <Field id="inv-navn" label="Navn">
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
              </div>
            </div>

            {kodeMelding && !feil ? (
              <p className="text-[12px] text-fg-muted">{kodeMelding}</p>
            ) : null}
            {feil ? (
              <p role="alert" className="text-[12px] text-danger">
                {feil}
              </p>
            ) : null}

            <StatefulButton
              type="submit"
              state={sender ? 'loading' : 'idle'}
              className="w-full"
              loadingText="Oppretter …"
              successText="Sendt"
              errorText="Prøv igjen"
              icon={<Mail size={15} />}
              disabled={
                sender ||
                navn.trim().length < 2 ||
                Boolean(inv?.kreverKode && kode.trim().length < 6)
              }
            >
              Fortsett
            </StatefulButton>

            {inv?.kreverKode ? (
              <button
                type="button"
                className="text-center text-[15px] font-[450] text-fg underline underline-offset-4 disabled:text-fg-muted disabled:no-underline"
                disabled={nyKodeVent}
                onClick={() => void sendKode()}
              >
                Fikk ingen kode?
              </button>
            ) : null}
          </form>
        ) : null}

        {inv && steg === 'sendt' ? (
          <div className="rounded-xl border border-border bg-card p-4 text-[12px] text-fg-muted leading-relaxed">
            Åpne lenken i e-posten for å logge inn. Ingen passord. Autentikator er valgfri.
          </div>
        ) : null}
      </div>
    </main>
  );
}
