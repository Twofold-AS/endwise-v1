/**
 * Lokal tilbake-pil. Ikke lucide ChevronLeft — Mikael 01.09.2026:
 * egen SVG så åpen/lukket/tilbake ikke hopper i størrelse mot lucide-default.
 */
export function TilbakePil({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M10.25 3.25 5.5 8l4.75 4.75"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
