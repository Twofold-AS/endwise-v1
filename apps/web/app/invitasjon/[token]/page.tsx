'use client';

import { Lock, StatefulButton } from '@endwise/ui';
import Image from 'next/image';
import { use, useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { Field, INPUT, PassordFelt } from '../../_auth/felter';

/**
 * F1-10 / F5-26 — INVITEE-SIDEN. Første møte med Endwise.
 *
 * ── ⚠️ Hvorfor denne ligger UTENFOR `(app)` ──────────────────────────────
 * Den som åpner lenka har ingen konto, ingen sesjon og ingen forhandler. Hele
 * `(app)` henter data over tRPC, som krever begge deler — og fra F1-11 også
 * fullført 2FA. Denne siden snakker derfor kun med to offentlige endepunkter:
 * `/invitasjoner/*` (vår egen) og `/api/auth/*` (Better-Auth).
 *
 * ── Kjeden ───────────────────────────────────────────────────────────────
 *   1. HER: sett/bytt passord (eier alltid; ny ansatt alltid)
 *   2. Better-Auth: logg inn
 *   3. `/2fa-oppsett` (F1-11)
 *   4. Eier: `/oppstart` (visningsnavn, valgfrie tillegg, team).
 *      Ansatt: lander i funksjonens visning. ⛔ Ingen plan-velger her.
 *
 * ── Chrome ───────────────────────────────────────────────────────────────
 * Samme skall som `/signin` og `/2fa-oppsett`: sentrert `max-w-sm`, logo
 * 44×44, kort `p-[5px]` + inset, `Field` / `PassordFelt` / `StatefulButton`.
 * Ingen ny pakke. Ingen butikk- eller SMS-modul. Ingen egen admin-fane.
 */
type Invitasjon = {
  gyldig: true;
  epost: string;
  funksjon: string;
  kind: 'staff' | 'owner';
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

  const [inv, setInv] = useState<Invitasjon | null>(null);
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState<string | null>(null);
  const [navn, setNavn] = useState('');
  const [passord, setPassord] = useState('');
  const [sender, setSender] = useState(false);
  const [ferdig, setFerdig] = useState(false);

  useEffect(() => {
    let avbrutt = false;
    void (async () => {
      try {
        const res = await fetch(`/invitasjoner/${encodeURIComponent(token)}`);
        const data = await res.json();
        if (avbrutt) return;
        if (!res.ok || !data?.gyldig) {
          setFeil(data?.grunn ?? 'Invitasjonen er ugyldig, brukt eller utløpt.');
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
        window.location.assign('/signin');
        return;
      }

      window.location.assign('/2fa-oppsett');
    } catch (error) {
      setFeil((error as Error).message);
    } finally {
      setSender(false);
    }
  }

  const rolle =
    inv?.kind === 'owner' ? 'eier' : (FUNKSJONSTEKST[inv?.funksjon ?? ''] ?? inv?.funksjon);
  const tittel = inv
    ? `Velkommen til ${inv.forhandler}`
    : laster
      ? 'Invitasjon'
      : 'Invitasjonen virker ikke';
  const undertekst = inv
    ? inv.kind === 'owner'
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

        {inv ? (
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
      </div>
    </main>
  );
}
