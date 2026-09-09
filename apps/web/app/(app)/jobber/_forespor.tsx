/**
 * Timeplan › Forespørsler — jobb-forespørsler (ekstra tid / bytte).
 * Ekstra tid på Min dag er prototype og har ingen rad i basen ennå.
 */
export function TimeplanForespor() {
  return (
    <div data-timeplan-forespor className="flex flex-col gap-3">
      <p className="text-body text-fg-muted">
        Forespørsler om tid og endring på jobben. Ekstra tid fra mekaniker er prototype og vises
        ikke her ennå.
      </p>
      <p className="py-8 text-center text-label text-fg-muted">Ingen ventende forespørsler.</p>
    </div>
  );
}
