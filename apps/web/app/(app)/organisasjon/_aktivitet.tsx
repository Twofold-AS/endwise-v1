/**
 * Aktivitetsmerke på ansattkort.
 * Jonas: accent-soft / success. Ikke Ny-rød.
 */
export function AktivitetMerke({
  status,
  label,
}: {
  status: string | null | undefined;
  label: string | null | undefined;
}) {
  const tekst = label ?? 'Ingen status';
  const ledig = status === 'ledig';
  const farge = ledig
    ? 'bg-success/15 text-success'
    : status === 'opptatt' || status === 'på_jobb'
      ? 'bg-accent-soft text-fg'
      : 'bg-surface-2 text-fg-muted';
  return (
    <span className={`inline-flex h-5 items-center rounded-badge px-1.5 text-label ${farge}`}>
      {tekst}
    </span>
  );
}
