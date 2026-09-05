/**
 * Tilbake er bare pil med hale (←), stroke 2 — ingen «Tilbake»-tekst.
 * Samme 24px-strekfamilie som `icons/x.svg`. Ikke lucide.
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
        d="M19 12H5M12 19l-7-7 7-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
