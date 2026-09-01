'use client';

import { Mail, StatefulButton } from '@endwise/ui';
import Image from 'next/image';
import { use, useEffect, useState } from 'react';
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
};

const FUNKSJONSTEKST: Record<string, string> = {
  selger: 'selger',
  support: 'support',
  mekaniker: 'mekaniker',
  leder: 'eier',
};

export default function InvitasjonPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [inv, setInv] = useState<Invitasjon | null>(null);
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState<string | null>(null);
  const [navn, setNavn] = useState('');
  const [sender, setSender] = useState(false);
  const [steg, setSteg] = useState<'skjema' | 'sendt'>('skjema');

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

  async function godta(event: React.FormEvent) {
    event.preventDefault();
    if (!inv) return;
    setFeil(null);
    setSender(true);
    try {
      const res = await fetch('/invitasjoner/godta', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, navn: navn.trim() }),
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
              {feil ? (
                <p role="alert" className="text-[12px] text-danger">
                  {feil}
                </p>
              ) : null}
            </div>
            <div className="px-1.5 pt-1 pb-1">
              <StatefulButton
                type="submit"
                state={sender ? 'loading' : 'idle'}
                className="w-full"
                loadingText="Oppretter …"
                successText="Sendt"
                errorText="Prøv igjen"
                icon={<Mail size={15} />}
                disabled={sender || navn.trim().length < 2}
              >
                Fortsett
              </StatefulButton>
            </div>
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
