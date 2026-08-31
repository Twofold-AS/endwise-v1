import { hexForFarge } from '@endwise/ui';

/**
 * Occupancy-tekst + staff-prikk. Prikkens farge er personens ColorId,
 * ikke ledig/opptatt-grønn. Status står som tekst.
 */
export function StatusMerke({
  label,
  farge,
  seed,
}: {
  status: string | null | undefined;
  label: string | null | undefined;
  farge?: string | number | null;
  seed?: string;
}) {
  const tekst = label ?? 'Ingen status';
  return (
    <span className="flex items-center gap-1.5 text-[12px] text-fg-muted">
      <span
        aria-hidden
        className="inline-block size-2 rounded-full"
        style={{ backgroundColor: hexForFarge(farge, seed) }}
      />
      {tekst}
    </span>
  );
}
