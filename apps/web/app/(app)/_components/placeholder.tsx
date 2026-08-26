/**
 * Placeholder for sider som ennå ikke er bygget (F3/F5). Holder shellet + to-
 * nivå-navigasjonen demonstrerbar: å velge en seksjon i topbaren og klikke et
 * underpunkt i sidebaren viser denne, i stedet for en 404 utenfor shellet.
 * Backend/tRPC finnes for de fleste (se roadmap-mapping).
 */
export function Placeholder({
  title,
  phase,
  note,
}: {
  title: string;
  phase: string;
  note?: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="font-semibold text-fg text-xl tracking-tight">{title}</h1>
        <p className="text-fg-muted text-sm">{note ?? 'Bygges i en kommende fase.'}</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-10 text-center">
        <p className="font-medium text-fg text-sm">Kommer i {phase}</p>
        <p className="mt-1 text-fg-faint text-xs">
          Backend/tRPC-ruteren er klar — denne flaten trenger UI + kobling.
        </p>
      </div>
    </div>
  );
}
