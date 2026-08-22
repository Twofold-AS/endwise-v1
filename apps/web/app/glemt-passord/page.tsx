'use client';

import { Mail, StatefulButton } from '@endwise/ui';
import Image from 'next/image';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { Field, INPUT } from '../_auth/felter';

/**
 * F1-15 — «Glemt passord»: be om en resetlenke.
 *
 * ── ⛔ Skjermens ene sikkerhetsregel ─────────────────────────────────────
 * **Den skal se nøyaktig lik ut enten adressen finnes eller ikke.**
 *
 * Better-Auth svarer allerede identisk på begge (samme JSON, samme melding,
 * og med en simulert token-generering + oppslag for å jevne ut tidsbruken —
 * lest i `dist/api/routes/password.mjs`). Men serveren kan gjøre alt riktig
 * og likevel lekke, hvis KLIENTEN sier «vi fant ingen bruker». Derfor viser
 * denne siden samme kvittering uansett hva svaret var — og også hvis kallet
 * feilet.
 *
 * ⚠️ Det siste er ikke slurv. En feilmelding som bare dukker opp for adresser
 * som finnes, er den samme lekkasjen med en annen innpakning. Går noe galt,
 * er det verdt mer at brukeren prøver igjen enn at vi forteller en fremmed
 * hvem som er kunde her.
 *
 * ── Hvorfor ruta ligger utenfor `(app)` ──────────────────────────────────
 * Samme grunn som `/signin` og `/invitasjon/[token]`: den som er her har
 * ingen sesjon, og hele `(app)` henter data over tRPC som krever både sesjon
 * og fullført 2FA.
 */
export default function GlemtPassordPage() {
  const [epost, setEpost] = useState('');
  const [sendt, setSendt] = useState(false);
  const [busy, setBusy] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy('loading');

    /**
     * ⚠️ `.catch()` som svelger — med vilje, se filkommentaren. Vi trimmer
     * adressen av samme grunn som `/signin` gjør: et limt inn mellomrom gir
     * ellers `400 Invalid email` på en adresse som ser helt riktig ut.
     */
    await authClient.requestPasswordReset({ email: epost.trim() }).catch(() => undefined);

    setBusy('success');
    setSendt(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 text-fg">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image src="/logo/logo.svg" alt="Endwise" width={44} height={44} priority />
          <h1 className="text-title text-fg">{sendt ? 'Sjekk e-posten din' : 'Glemt passord'}</h1>
          <p className="text-center text-body text-fg-muted">
            {sendt
              ? 'Finnes det en konto på adressen, har vi sendt en lenke dit.'
              : 'Skriv e-postadressen din, så sender vi en lenke for å velge nytt passord.'}
          </p>
        </div>

        {sendt ? (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-[5px]">
            <div className="flex flex-col gap-3 rounded-lg bg-inset p-4">
              <p className="flex items-start gap-2 text-[12px] text-fg-muted leading-relaxed">
                <Mail size={13} className="mt-px shrink-0" />
                <span>
                  Lenken kan brukes <b>én gang</b> og varer i 30 minutter. Når passordet er byttet,
                  blir du logget ut på alle enheter og må logge inn på nytt — med engangskode, som
                  vanlig.
                </span>
              </p>
              <p className="text-[12px] text-fg-muted leading-relaxed">
                Kommer det ingenting? Sjekk søppelposten, og at adressen var riktig skrevet. Kjører
                du lokalt uten Resend, står lenken i api-loggen i terminalen.
              </p>
            </div>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-[5px]"
          >
            <div className="flex flex-col gap-3 rounded-lg bg-inset p-4">
              <Field id="glemt-epost" label="E-post">
                <input
                  id="glemt-epost"
                  type="email"
                  autoComplete="email"
                  required
                  value={epost}
                  onChange={(ev) => setEpost(ev.target.value)}
                  className={INPUT}
                  placeholder="deg@twofold.no"
                />
              </Field>
            </div>
            <div className="px-1.5 pt-1 pb-1">
              <StatefulButton
                type="submit"
                state={busy}
                className="w-full"
                loadingText="Sender …"
                successText="Sendt"
                errorText="Prøv igjen"
                icon={<Mail size={15} />}
              >
                Send meg en lenke
              </StatefulButton>
            </div>
          </form>
        )}

        <p className="mt-4 text-center text-[12px] text-fg-muted">
          <Link href="/signin" className="underline underline-offset-2 hover:text-fg">
            Tilbake til innlogging
          </Link>
        </p>
      </div>
    </main>
  );
}
