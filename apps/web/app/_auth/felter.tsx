'use client';

/**
 * Feltene de uinnloggede skjermene deler (magic link, 2FA, invitasjon, e-post).
 * Hvorfor de bor her og ikke i `packages/ui`
 * Ui-pakker §4 sier at UI hentes fra pakker. `packages/ui` har en `Input`,
 * men den er `h-10` med `rounded-md`. Innlogging følger Mobbin text-input:
 * feltfyll `#f0f0f0` (`bg-inset`), `rounded-sm` 16px, padding sm/md.
 * Felt på lerret (`bg-bg`) — ikke kort-chrome.
 */

/** Mobbin text-input: feltfyll, 16px radius, mer vertikal padding, ≥16px (iOS-zoom).
 * Fokus: 2px hvit kant rundt hele feltet. På lyst lerret følger en ink-ytrekant
 * så den hvite ringen ikke forsvinner mot `#ffffff`. */
export const INPUT =
  'min-h-[52px] w-full rounded-[16px] border-2 border-transparent bg-inset px-4 py-3.5 text-[17px] font-[450] leading-[22px] text-fg outline-none placeholder:text-fg-muted focus:border-white focus:shadow-[0_0_0_2px_#ffffff,0_0_0_4px_#141414] focus-visible:border-white focus-visible:shadow-[0_0_0_2px_#ffffff,0_0_0_4px_#141414] dark:focus:shadow-[0_0_0_2px_#ffffff] dark:focus-visible:shadow-[0_0_0_2px_#ffffff]';

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
