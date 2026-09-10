import type { ReactNode } from 'react';

/**
 * Innstillinger-inndeling: seksjonstittel + hårlinje-rader.
 * Samme rytme som Konto / Org / Kunde-Endre — ingen CardShell-boks.
 */
export function InnstillingSeksjon({
  tittel,
  ingress,
  children,
}: {
  tittel: string;
  ingress?: string;
  children: ReactNode;
}) {
  return (
    <section data-innstilling-seksjon={tittel} className="flex flex-col">
      <div className="pb-2">
        <h2 className="text-title text-fg">{tittel}</h2>
        {ingress ? <p className="mt-1 text-[13px] text-fg-muted">{ingress}</p> : null}
      </div>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

export function InnstillingRad({
  label,
  hint,
  siste,
  children,
}: {
  label: string;
  hint?: string;
  siste?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={siste ? '' : 'border-border border-b'} data-innstilling-rad={label}>
      <div className="flex flex-col gap-2 py-4">
        <div>
          <p className="text-label text-fg">{label}</p>
          {hint ? <p className="mt-1 text-[13px] text-fg-muted">{hint}</p> : null}
        </div>
        {children}
      </div>
    </div>
  );
}
