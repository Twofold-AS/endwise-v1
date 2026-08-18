import { CircleAlert, Store } from '@endwise/ui';
import { CardShell } from '../_shell/cards';

/**
 * F5-28 — BUTIKK-konteksten. **Bevisst tomt skall.**
 *
 * Eier designer denne selv. Å fylle den med en kulisse — noen kort, en liste,
 * et par tall — ville gjort det vanskeligere, ikke lettere: da måtte designet
 * begynne med å rive noe i stedet for på blankt ark.
 *
 * Konteksten vises kun i dev-mode (`requiresDevMode` i nav.ts). Det er ikke
 * en sikkerhetssperre — sperren er at ruten uansett ikke leser noe. Det er en
 * anstendighetssperre: en forhandler skal ikke se en tom fane i produktet sitt.
 */
export default function ButikkPage() {
  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="sr-only">Butikk</h1>
        <p className="flex items-center gap-2 text-title text-fg">
          <Store size={18} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
          Butikk
        </p>
        <p className="text-body text-fg-muted">Konteksten finnes. Innholdet er ikke designet.</p>
      </div>

      <CardShell className="flex items-start gap-3 p-6">
        <CircleAlert size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-fg-muted" />
        <div className="flex flex-col gap-1">
          <p className="text-label text-fg">Venter på design</p>
          <p className="text-body text-fg-muted leading-relaxed">
            Det finnes ingen butikk-rolle, ingen butikk-ruter og ingen produkt-, pris- eller
            lagermodell i Endwise i dag. Hva en «butikk» ER i produktet er en beslutning som må tas
            før noe bygges — den henger sammen med «Nettbutikk» under AI-verktøy (F5-24).
          </p>
        </div>
      </CardShell>
    </div>
  );
}
