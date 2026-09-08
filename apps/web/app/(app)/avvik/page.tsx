/**
 * Stub for Avvik-ikonet på forhandler-hjem.
 * Ingen dealer-liste ennå — mekaniker melder avvik fra åpen jobb (F7-05).
 */
export default function AvvikPage() {
  return (
    <div
      data-avvik-stub
      className="mx-auto flex w-full max-w-[1120px] flex-col gap-3 px-4 py-6 md:px-8 md:py-7"
    >
      <h1 className="text-title text-fg">Avvik</h1>
      <p className="text-body text-fg-muted">
        Oversikt over avvik meldt fra mekanikere kommer her. Mekanikere melder avvik fra den åpne
        jobben. Ingen liste-rute ennå (F7-05).
      </p>
    </div>
  );
}
