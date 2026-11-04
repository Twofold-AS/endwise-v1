/**
 * Fallback etter at token er fjernet fra URL-en (F8a).
 * Refresh uten token = samme feil som ugyldig lenke. Ingen enumerering.
 */
export default function InvitasjonUtenToken() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 text-fg">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <h1 className="text-title text-fg">Invitasjonen virker ikke</h1>
          <p className="text-center text-body text-fg-muted">
            Lenker er personlige, kan brukes én gang, og utløper etter sju dager.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-[12px] text-fg-muted">
          Invitasjonen er ugyldig, brukt eller utløpt.
        </div>
      </div>
    </main>
  );
}
