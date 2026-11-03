'use client';

export type SjekkRad = {
  id: string;
  etikett: string;
  verdi: string;
};

export function SjekkSteg({
  rader,
  onEndre,
}: {
  rader: readonly SjekkRad[];
  onEndre: (id: string) => void;
}) {
  return (
    <ul data-sjekk-steg className="flex flex-col">
      {rader.map((rad) => (
        <li
          key={`${rad.id}-${rad.etikett}`}
          className="flex items-center justify-between gap-3 border-border border-b py-3"
        >
          <div className="min-w-0">
            <p className="text-meta text-fg-muted">{rad.etikett}</p>
            <p className="truncate text-body text-fg">{rad.verdi || '—'}</p>
          </div>
          <button
            type="button"
            onClick={() => onEndre(rad.id)}
            className="inline-flex h-11 shrink-0 items-center px-2 text-label text-fg"
          >
            Endre
          </button>
        </li>
      ))}
    </ul>
  );
}
