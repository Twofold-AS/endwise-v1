import type { Route } from 'next';
import Link from 'next/link';

/** Norsk 404 inne i dealer-skallet. */
export function IkkeFunnet() {
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-3 px-8 py-20 text-center">
      <p className="text-title text-fg">Siden finnes ikke</p>
      <p className="text-body text-fg-muted">
        Adressen peker ikke på en side i Endwise. Gå tilbake til verkstedet.
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
