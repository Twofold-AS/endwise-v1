'use client';

import { Eye, EyeOff } from '@endwise/ui';
import { useId, useState } from 'react';

/**
 * F1-15 / F1-16 / F1-18 — feltene de uinnloggede skjermene deler.
 *
 * ── Hvorfor de bor her og ikke i `packages/ui` ───────────────────────────
 * UI-PAKKER §4 sier at UI hentes fra pakker. `packages/ui` HAR en `Input`,
 * men den er `h-10` med `rounded-md` — mens `/signin` bruker eierens
 * kontrollspec (`h-control` = 32px, `rounded-control` = 10px). De to er ikke
 * samme kontroll, og å endre den delte primitiven for å treffe innloggingen
 * ville flyttet spec-en for alle andre kallsteder i samme slengen.
 *
 * Så: samme klassestreng som `/signin` allerede eide, løftet ut ett hakk slik
 * at `/glemt-passord` og `/nytt-passord` arver den i stedet for å kopiere
 * den. Tre kopier av en inputstil blir tre ulike inputstiler.
 *
 * ⛔ Ingen ny pakke hentet inn. Avsløringsknappen (F1-18) finnes ikke som
 * komponent i shadcn/ui — der er passordfelt bare `Input type="password"` —
 * så den er egenskrevet, og begrunnelsen er notert i UI-PAKKER §8.
 */

/** Input = kontrollhøyde 32px, radius 10px, brødtekst (eierens spec). */
export const INPUT =
  'h-control rounded-control border border-border bg-bg px-3 text-body text-fg outline-none placeholder:text-fg-muted focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring';

export function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-label text-fg-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * F1-18 — passordfelt med vis/skjul.
 *
 * ── ⚠️ Hvorfor denne knappen er en sikkerhetsting, ikke pynt ─────────────
 * `/signin` har en feilmelding som i dag lyder: «Skriv passordet for hånd
 * hvis nettleseren fylte det ut for deg.» Den finnes fordi et passord limt
 * inn fra en melding eller et dokument nesten alltid drar med seg et
 * mellomrom, feltet viser bare prikker, og Better-Auth svarer da nøyaktig
 * samme 401 som ved feil passord (se `feilmelding()` i `signin/signin-skjema.tsx`).
 * Koden trimmer det bort, men brukeren får aldri VITE at det var det.
 *
 * En avsløringsknapp gjør akkurat den feilen synlig — og den er dobbelt så
 * viktig på `/nytt-passord`, der man skriver et passord man selv finner på og
 * ikke får en ny sjanse til å oppdage at det ble en annen enn man trodde.
 *
 * ── Detaljer som er valgt, ikke tilfeldige ───────────────────────────────
 * · `type="button"` — ellers ville knappen submitet skjemaet.
 * · `tabIndex={-1}` — den skal ikke ligge mellom passordfeltet og «Logg inn»
 *   i tabrekkefølgen. Den som taber gjennom, vil videre, ikke se passordet.
 * · `aria-pressed` + `aria-label` som endrer seg, slik at en skjermleser får
 *   vite hva tilstanden ER, ikke bare at det finnes en knapp.
 * · Feltet får `pr-9` så teksten ikke løper under ikonet.
 * · ⚠️ `autoComplete` sendes inn av kallstedet: `current-password` på
 *   innlogging, `new-password` på reset. Feil verdi her får passordbehandlere
 *   til å tilby det gamle passordet der man skal finne på et nytt.
 */
export function PassordFelt({
  id,
  label,
  value,
  onChange,
  autoComplete,
  placeholder = '••••••••••••',
  required = true,
  autoFocus = false,
  beskrivelse,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (verdi: string) => void;
  autoComplete: 'current-password' | 'new-password';
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  beskrivelse?: string;
}) {
  const [synlig, setSynlig] = useState(false);
  const hjelpeId = useId();

  return (
    <Field id={id} label={label}>
      <div className="relative flex items-center">
        <input
          id={id}
          type={synlig ? 'text' : 'password'}
          autoComplete={autoComplete}
          required={required}
          // biome-ignore lint/a11y/noAutofocus: fokus på det ene feltet skjermen finnes for
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${INPUT} w-full pr-9`}
          placeholder={placeholder}
          aria-describedby={beskrivelse ? hjelpeId : undefined}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setSynlig((s) => !s)}
          aria-pressed={synlig}
          aria-label={synlig ? 'Skjul passordet' : 'Vis passordet'}
          title={synlig ? 'Skjul passordet' : 'Vis passordet'}
          className="absolute right-1.5 inline-flex size-6 items-center justify-center rounded-[7px] text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          {synlig ? <EyeOff size={14} strokeWidth={1.75} /> : <Eye size={14} strokeWidth={1.75} />}
        </button>
      </div>
      {beskrivelse && (
        <p id={hjelpeId} className="text-[12px] text-fg-muted">
          {beskrivelse}
        </p>
      )}
    </Field>
  );
}
