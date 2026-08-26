/**
 * Samme occupancy-prikk som `/mekanikere` og Mekanikere-pillen.
 * Ingen presence. Uten belegg: ærlig «Ingen status», ikke falsk grønn.
 */
export const STATUS_PRIKK: Record<string, string> = {
  ledig: 'bg-success',
  på_jobb: 'bg-warn',
  opptatt: 'bg-warn',
  fri: 'bg-fg-muted',
};

export function StatusMerke({
  status,
  label,
}: {
  status: string | null | undefined;
  label: string | null | undefined;
}) {
  const tekst = label ?? 'Ingen status';
  const prikk = status ? (STATUS_PRIKK[status] ?? 'bg-fg-muted') : 'bg-fg-muted';
  return (
    <span className="flex items-center gap-1.5 text-[12px] text-fg-muted">
      <span aria-hidden className={`inline-block size-2 rounded-full ${prikk}`} />
      {tekst}
    </span>
  );
}
