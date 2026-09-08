/**
 * Compose-ikon — penn på ark, ikke Messages-plus-boble.
 * Mikael CODE-GO 08.09.2026: nytt SVG, sitter ytterst til høyre.
 */
export function NyMeldingIkon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <title>Ny melding</title>
      <path
        d="M4 16.5 15.5 5a2.1 2.1 0 0 1 3 3L7 19.5H4v-3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M13.2 6.8 17.2 10.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
