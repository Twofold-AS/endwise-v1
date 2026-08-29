import { FERIE_MOCK } from './forhandler-kort';

/**
 * Mock: feriedager per ansatt. Ingen backend, ingen e-post.
 * Låst IA 29.08.2026 — så staff senere kan sende ferieønske til riktig flate.
 */
export function FerieMock() {
  return (
    <section
      aria-label="Ferie"
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
    >
      <div>
        <h2 className="text-title text-fg">Ferie</h2>
        <p className="text-[12px] text-fg-muted">
          Kommer — mock. Feriedager per ansatt, så forespørsler kan landet her senere. Ingen
          sending.
        </p>
      </div>
      <ul className="flex flex-col gap-1">
        {FERIE_MOCK.map((r) => (
          <li
            key={r.navn}
            className="flex h-row items-center justify-between border-border border-b last:border-b-0"
          >
            <span className="text-label text-fg">{r.navn}</span>
            <span className="text-[12px] text-fg-muted tabular-nums">{r.dager} dager</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
