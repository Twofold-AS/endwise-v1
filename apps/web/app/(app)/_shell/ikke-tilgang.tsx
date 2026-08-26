import type { Route } from 'next';
import Link from 'next/link';

/**
 * 403 for innlogget forhandler på Endwise-interne sider.
 * Sesjonen beholdes — aldri /signin.
 */
export function IkkeTilgang() {
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-3 px-8 py-20 text-center">
      <p className="text-title text-fg">Ikke tilgang</p>
      <p className="text-body text-fg-muted">
        Denne siden er for Endwise, ikke for verkstedet. Du er fortsatt innlogget.
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
