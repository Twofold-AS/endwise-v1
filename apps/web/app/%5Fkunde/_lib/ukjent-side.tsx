import type { Metadata } from 'next';

export const ukjentMetadata: Metadata = {
  title: 'Siden finnes ikke',
  robots: { index: false, follow: false },
};

/** Nøytral 404. Ingen slug, ingen Endwise, ingen lenke til verkstedet. */
export function UkjentSide() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-4 text-center">
      <h1 className="text-title text-fg max-md:text-[24px] max-md:font-[650]">Siden finnes ikke</h1>
      <p className="max-w-md text-body text-fg-muted max-md:text-[16px]">
        Adressen peker ikke på en side. Sjekk at lenken er skrevet riktig.
      </p>
    </main>
  );
}
