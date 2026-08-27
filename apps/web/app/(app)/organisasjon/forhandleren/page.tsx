'use client';

import { ForhandlerKort } from './_kort';

/**
 * Organisasjon › Forhandleren — butikken, ikke personen.
 * Person-profilen bor i Innstillinger.
 */
export default function ForhandlerenPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="text-title text-fg">Forhandleren</h1>
        <p className="text-body text-fg-muted">
          Verkstedets firmanavn og kontakt. Din profil ligger under Innstillinger.
        </p>
      </div>
      <ForhandlerKort />
    </div>
  );
}
