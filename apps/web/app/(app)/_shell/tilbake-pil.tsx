/**
 * Tilbake er bare pil — ingen «Tilbake»-tekst.
 * Path fra samme 24px-strekfamilie som `icons/x.svg` / NyMeldingIkon
 * (stroke 2, round). Ingen arrow-left i assets; ikke lucide.
 */
export function TilbakePil({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="presentation"
      aria-hidden
    >
      <path
        d="M15 6L9 12L15 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
