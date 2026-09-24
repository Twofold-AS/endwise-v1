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
  const paJobb = status === 'opptatt' || status === 'på_jobb';
  const tekst = paJobb ? 'På jobb' : status === 'ledig' ? 'Av vakt' : (label ?? 'Av vakt');
  const farge = paJobb ? 'bg-surface-2 text-fg' : 'bg-field text-fg-muted';
  return (
    <span className={`inline-flex h-5 items-center rounded-badge px-1.5 text-label ${farge}`}>
      {tekst}
    </span>
  );
}
