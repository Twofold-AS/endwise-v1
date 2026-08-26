import type { Route } from 'next';
import Link from 'next/link';

/**
 * Norsk 404 — ikke rå «This page could not be found» fra Next.
 * Dealer-URLer som /ansatte og /innstillinger/koblinger har egne alias;
 * denne fanger resten.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
      <p className="text-title text-fg">Siden finnes ikke</p>
      <p className="max-w-md text-body text-fg-muted">
        Adressen peker ikke på en side i Endwise. Gå tilbake til verkstedet, eller sjekk at lenken
        er skrevet riktig.
      </p>
      <Link
        href={'/dashboard' as Route}
        className="mt-2 inline-flex h-control items-center rounded-control bg-fg px-4 text-label text-bg"
      >
        Tilbake til Verkstedet
      </Link>
    </div>
  );
}
