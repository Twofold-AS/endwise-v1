'use client';

/**
 * Feltene de uinnloggede skjermene deler (magic link, 2FA, invitasjon, e-post).
 * Hvorfor de bor her og ikke i `packages/ui`
 * Ui-pakker §4 sier at UI hentes fra pakker. `packages/ui` har en `Input`,
 * men den er `h-10` med `rounded-md` — mens `/signin` bruker eierens
 * kontrollspec (`h-control` = 32px, `rounded-control` = 10px). De to er ikke
 * samme kontroll. Innlogging er magic link + TOTP, uten passordfelt.
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
