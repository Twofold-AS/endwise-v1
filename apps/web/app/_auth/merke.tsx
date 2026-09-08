/**
 * Token-aware Endwise-merke til uinnloggede skjermer.
 * `logo.svg` er svart — Image på `bg-bg` i mørkt tema blir usynlig.
 * Samme mask + `bg-fg` som PhoneShell / markedsside: ink i lys, canvas i mørk.
 */

export function AuthMerke({ storrelse = 44 }: { storrelse?: number }) {
  const hoyde = Math.round((storrelse * 1152) / 928);
  return (
    <span
      role="img"
      aria-label="Endwise"
      data-auth-merke
      className="inline-flex shrink-0 bg-fg"
      style={{
        width: storrelse,
        height: hoyde,
        maskImage: 'url(/logo/logo.svg)',
        maskSize: 'contain',
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskImage: 'url(/logo/logo.svg)',
        WebkitMaskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
      }}
    />
  );
}
