'use client';

import { FeltInput, StatefulButton } from '@endwise/ui';
import Image from 'next/image';
import { use, useEffect, useState } from 'react';

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
  vert?: string;
  landing?: string;
};

const FUNKSJONSTEKST: Record<string, string> = {
  selger: 'selger',
  support: 'support',
  mekaniker: 'mekaniker',
  leder: 'eier',
};

const CSRF = { 'x-endwise-csrf': '1' } as const;
const VENT_MS = 1200;

function sammeVert(forventet: string | undefined): boolean {
  if (!forventet) return true;
  try {
    return new URL(forventet).hostname === window.location.hostname;
  } catch {
    return true;
  }
}

export default function InvitasjonPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [inv, setInv] = useState<Invitasjon | null>(null);
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState<string | null>(null);
  const [navn, setNavn] = useState('');
  const [sender, setSender] = useState(false);
  const [klar, setKlar] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setKlar(true), VENT_MS);
    return () => window.clearTimeout(t);
  }, []);

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
          if (gyldig.vert && !sammeVert(gyldig.vert)) {
            window.location.replace(`${gyldig.vert.replace(/\/$/, '')}/invitasjon/${token}`);
            return;
          }
          setInv(gyldig);
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
        headers: { 'content-type': 'application/json', ...CSRF },
        credentials: 'same-origin',
        body: JSON.stringify({ token, navn: navn.trim() }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        landing?: string;
      } | null;
      if (!res.ok) {
        setFeil(data?.error ?? 'Noe gikk galt.');
        return;
      }
      window.location.assign(data?.landing ?? inv.landing ?? '/home');
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

  const visSkjema = Boolean(inv);

  const tittel = inv
    ? inv.kind === 'platform'
      ? 'Velkommen til Endwise'
      : `Velkommen til ${inv.forhandler}`
    : laster
      ? 'Invitasjon'
      : 'Invitasjonen virker ikke';

  const undertekst = inv
    ? inv.kind === 'platform'
      ? `Du er invitert til Endwise-support. Kontoen knyttes til ${inv.epost}.`
      : `Du er invitert som ${rolle}. Kontoen knyttes til ${inv.epost}.`
    : laster
      ? null
      : 'Lenker er personlige, kan brukes én gang, og utløper etter sju dager.';

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4 pb-[14vh] text-fg">
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
          <form onSubmit={(e) => void godta(e)} className="flex flex-col gap-4">
            <FeltInput
              id="inv-navn"
              label="Navn"
              autoComplete="name"
              isRequired
              value={navn}
              onChange={setNavn}
              placeholder="Hva heter du?"
            />

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
              disabled={sender || !klar || navn.trim().length < 2}
            >
              Neste
            </StatefulButton>
          </form>
        ) : null}
      </div>
    </main>
  );
}
