'use client';

import { use, useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';

/**
 * F1-10 — INVITEE-SIDEN. Første møte med Endwise.
 *
 * ── ⚠️ Hvorfor denne ligger UTENFOR `(app)` ──────────────────────────────
 * Den som åpner lenka har ingen konto, ingen sesjon og ingen forhandler. Hele
 * `(app)` henter data over tRPC, som krever begge deler — og fra F1-11 også
 * fullført 2FA. Denne siden snakker derfor kun med to offentlige endepunkter:
 * `/invitasjoner/*` (vår egen) og `/api/auth/*` (Better-Auth). ⚠️ FLERTALL i
 * API-stien: SIDEN eier `/invitasjon/[token]`, så de kan ikke dele sti.
 *
 * ── Kjeden, og hvem som eier hvert ledd ──────────────────────────────────
 *   1. HER: bekreft invitasjonen, sett navn + passord   → konto + medlemskap
 *   2. Better-Auth: logg inn med det nye passordet      → sesjon
 *   3. `/2fa-oppsett` (F1-11): tvungen tofaktor         → dealer_staff KREVER 2FA
 *   4. `/` ruter videre til funksjonens landing (F1-14) → selger/support/mekaniker
 *
 * ⚠️ Steg 3 hoppes ikke over. `dealer_staff` står i `ROLES_REQUIRING_2FA`, så
 * serveren avviser sesjonen uansett hva denne siden gjør. Vi sender dem dit
 * med vilje, slik at de ikke møter en vegg de ikke forstår.
 *
 * ⚠️ **Bevisst udesignet**, som `/signin` og `/2fa-oppsett`. Dette er en
 * sikkerhets- og flytoppgave; uttrykket settes når eier styler innloggingen.
 */
type Invitasjon = {
  gyldig: true;
  epost: string;
  funksjon: string;
  forhandler: string;
  utloper: string;
  harKonto: boolean;
};

const FUNKSJONSTEKST: Record<string, string> = {
  selger: 'selger',
  support: 'support',
  mekaniker: 'mekaniker',
};

export default function InvitasjonPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [inv, setInv] = useState<Invitasjon | null>(null);
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState<string | null>(null);
  const [navn, setNavn] = useState('');
  const [passord, setPassord] = useState('');
  const [sender, setSender] = useState(false);

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
      const res = await fetch('/invitasjoner/godta', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token,
          navn: navn.trim(),
          ...(inv.harKonto ? {} : { passord }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeil(data?.error ?? 'Noe gikk galt.');
        return;
      }

      /**
       * Har hen alt en konto, kan vi ikke logge inn på hens vegne — vi har
       * ikke passordet. Da sendes hen til innlogging, som nå vet om det nye
       * medlemskapet.
       */
      if (inv.harKonto) {
        window.location.assign('/signin');
        return;
      }

      const inn = await authClient.signIn.email({ email: inv.epost, password: passord });
      if (inn.error) {
        window.location.assign('/signin');
        return;
      }

      // ⛔ Rett til 2FA-oppsett. `dealer_staff` krever tofaktor (F1-11), så
      // uten dette ville hen landet på en side der alt feiler.
      window.location.assign('/2fa-oppsett');
    } catch (error) {
      setFeil((error as Error).message);
    } finally {
      setSender(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg text-fg">
      <div className="mx-auto flex w-full max-w-[440px] flex-col gap-6 px-6 py-16 sm:py-24">
        {laster ? <p className="text-body text-fg-muted">Henter invitasjonen …</p> : null}

        {!laster && feil && !inv ? (
          <div className="flex flex-col gap-3">
            <h1 className="font-semibold text-fg text-xl tracking-tight">
              Invitasjonen virker ikke
            </h1>
            <p className="text-body text-fg-muted leading-relaxed">{feil}</p>
            <p className="text-[12px] text-fg-muted leading-relaxed">
              Lenker er personlige, kan brukes én gang, og utløper etter sju dager. Be lederen din
              om en ny.
            </p>
          </div>
        ) : null}

        {inv ? (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="font-semibold text-fg text-xl tracking-tight">
                Velkommen til {inv.forhandler}
              </h1>
              <p className="text-body text-fg-muted leading-relaxed">
                Du er invitert som <b>{FUNKSJONSTEKST[inv.funksjon] ?? inv.funksjon}</b>. Kontoen
                knyttes til <b>{inv.epost}</b>.
              </p>
            </div>

            <form onSubmit={godta} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="inv-navn" className="text-label text-fg">
                  Hva heter du?
                </label>
                <input
                  id="inv-navn"
                  autoComplete="name"
                  required
                  minLength={2}
                  value={navn}
                  onChange={(e) => setNavn(e.target.value)}
                  className="h-control rounded-control border border-border bg-bg px-3 text-body text-fg outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>

              {inv.harKonto ? (
                <p className="text-[12px] text-fg-muted leading-relaxed">
                  Du har allerede en Endwise-konto på denne e-posten. Vi legger deg til hos{' '}
                  {inv.forhandler} — logg inn med passordet du har fra før.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="inv-passord" className="text-label text-fg">
                    Velg et passord
                  </label>
                  <input
                    id="inv-passord"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={12}
                    value={passord}
                    onChange={(e) => setPassord(e.target.value)}
                    className="h-control rounded-control border border-border bg-bg px-3 text-body text-fg outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  />
                  <p className="text-[12px] text-fg-muted">
                    Minst 12 tegn. Etterpå setter du opp tofaktor — det er påkrevd for alle ansatte.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={
                  sender || navn.trim().length < 2 || (!inv.harKonto && passord.length < 12)
                }
                className="inline-flex h-control items-center justify-center rounded-control bg-fg px-4 text-label text-bg disabled:opacity-40"
              >
                {sender ? 'Oppretter …' : 'Fortsett'}
              </button>

              {feil ? (
                <p role="alert" className="text-body text-destructive">
                  {feil}
                </p>
              ) : null}
            </form>
          </>
        ) : null}
      </div>
    </main>
  );
}
