'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { INGEN_API, synligeOrgHub } from './_hub';

/**
 * Claude BIT 7 — hub-lenker på Org-oversikt.
 * Peker på eksisterende `?seksjon=` og `/jobber`. Ingen ny chrome.
 */
export function OrgHubSeksjoner({ isAdmin }: { isAdmin: boolean }) {
  const seksjoner = synligeOrgHub(isAdmin);
  return (
    <nav
      data-org-hub-seksjoner
      aria-label="Organisasjon"
      className="flex flex-col overflow-hidden rounded-xl border border-border"
    >
      {seksjoner.map((sek, i) => (
        <Link
          key={sek.id}
          href={sek.href as Route}
          className={`flex items-center justify-between gap-3 bg-bg px-4 py-3 hover:bg-surface-2 ${
            i > 0 ? 'border-border border-t' : ''
          }`}
        >
          <span className="text-label text-fg">{sek.label}</span>
          <span className="text-[12px] text-fg-muted">{sek.sub}</span>
        </Link>
      ))}
    </nav>
  );
}

/** Vaktliste per ukedag finnes ikke. Dagens status bor på Ansatte / Timeplan. */
export function TimeplanAnsatteNotat() {
  return (
    <section
      data-org-timeplan-ansatte
      className="flex flex-col gap-1 rounded-xl border border-border px-4 py-3"
    >
      <h3 className="text-label text-fg">Timeplan ansatte</h3>
      <p className="text-[12px] text-fg-muted">Vaktliste per ukedag · {INGEN_API}</p>
      <p className="text-[12px] text-fg-muted">
        Dagens bookinger og kapasitet ligger på Timeplan — ingen oppdiktet vaktliste.
      </p>
    </section>
  );
}
