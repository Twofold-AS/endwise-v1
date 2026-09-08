'use client';

import { FELT_LG } from '@endwise/ui';

/**
 * Feltene de uinnloggede skjermene deler (magic link, 2FA, invitasjon, e-post).
 * Standardfeltet er `.ew-felt` i `packages/ui` theme.css — samme som prompt/skjema.
 * Innlogging bruker stor variant (52px / 17px). Felt på lerret, ikke kort-chrome.
 */

/** Mobbin text-input: `.ew-felt-lg` — inset-fyll, 16px, 2px hvit fokus. */
export const INPUT = FELT_LG;

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
