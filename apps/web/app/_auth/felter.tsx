'use client';

/**
 * Feltene de uinnloggede skjermene deler (magic link, 2FA, invitasjon, e-post).
 * Hvorfor de bor her og ikke i `packages/ui`
 * Ui-pakker §4 sier at UI hentes fra pakker. `packages/ui` har en `Input`,
 * men den er `h-10` med `rounded-md`. Innlogging følger Mobbin text-input:
 * feltfyll `#f0f0f0` (`bg-inset`), `rounded-sm` 16px, padding sm/md.
 * Canvas-felt på canvas-kort — ikke `bg-bg` som smelter inn i sida.
 */

/** Mobbin text-input: feltfyll, 16px radius, mer vertikal padding, ≥16px (iOS-zoom). */
export const INPUT =
  'min-h-[52px] w-full rounded-[16px] border-0 bg-inset px-4 py-3.5 text-[17px] font-[450] leading-[22px] text-fg outline-none placeholder:text-fg-muted focus-visible:outline-[3px] focus-visible:outline-offset-0 focus-visible:outline-white';

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
      <label htmlFor={id} className="text-[15px] font-[450] leading-5 text-fg-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
