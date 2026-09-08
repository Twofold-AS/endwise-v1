'use client';

import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

export type SideChromeFane = {
  id: string;
  label: string;
  href: string;
  ingress?: string;
};

/**
 * Delt desktop-chrome for Innstillinger · Hjelp · Statistikk.
 * Telefon-tittel og underline-faner bor i PhoneShell top-bar 1+2.
 */
export function SideChromeSkall({
  tittel,
  ingress,
  faner,
  aktiv,
  children,
}: {
  tittel: string;
  ingress?: string;
  faner: readonly SideChromeFane[];
  aktiv: string;
  children: ReactNode;
}) {
  const def = faner.find((f) => f.id === aktiv) ?? faner[0];
  return (
    <div
      data-side-chrome={tittel}
      className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-4 py-6 md:px-8 md:py-7"
    >
      <div className="hidden md:block">
        <h1 className="text-title text-fg">{tittel}</h1>
        {ingress ? <p className="text-body text-fg-muted">{ingress}</p> : null}
      </div>

      {faner.length > 1 && (
        <div role="tablist" aria-label={tittel} className="hidden flex-wrap gap-5 md:flex">
          {faner.map((f) => {
            const valgt = f.id === aktiv;
            return (
              <Link
                key={f.id}
                href={f.href as Route}
                role="tab"
                aria-selected={valgt}
                scroll={false}
                className={`inline-flex items-center border-b-2 pb-1 text-label ${
                  valgt ? 'border-fg font-[650] text-fg' : 'border-transparent text-fg-muted'
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      )}

      <section role="tabpanel" aria-label={def?.label ?? tittel} className="flex flex-col gap-5">
        <div className="hidden md:block">
          <h2 className="text-title text-fg">{def?.label ?? tittel}</h2>
          {def?.ingress ? <p className="text-body text-fg-muted">{def.ingress}</p> : null}
        </div>
        {children}
      </section>
    </div>
  );
}
