'use client';

export function AngreToast({
  tekst,
  onAngre,
  onLukk,
}: {
  tekst: string;
  onAngre: () => void;
  onLukk: () => void;
}) {
  return (
    <div
      data-angre-toast
      className="fixed inset-x-3 bottom-4 z-40 flex items-center justify-between gap-3 rounded-[24px] border border-divide bg-card px-4 py-3 shadow-none md:inset-x-auto md:right-6 md:bottom-6 md:w-[360px]"
    >
      <p className="min-w-0 text-label text-fg">{tekst}</p>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={onAngre} className="text-label font-[650] text-fg">
          Angre
        </button>
        <button type="button" onClick={onLukk} className="text-label text-fg-muted">
          Lukk
        </button>
      </div>
    </div>
  );
}
