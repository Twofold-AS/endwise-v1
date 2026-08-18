import { CircleAlert, Store } from '@endwise/ui';
import { CardShell } from '../../_shell/cards';

/**
 * AI-VERKTØY › NETTBUTIKK — **scaffold, ikke funksjonalitet** (07.08.2026).
 *
 * Samme forbehold som søsterflaten «Nettside»: ruten finnes for navigasjonens
 * skyld. Ingen knapper, fordi ingen knapper virker ennå.
 *
 * ⚠️ Nettbutikk er dessuten en større beslutning enn en AI-flate: den forutsetter
 * produkt- og lagerdata Endwise ikke har i dag. Det er en samtale, ikke en task.
 */
export default function AiNettbutikkPage() {
  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="sr-only">AI-verktøy · Nettbutikk</h1>
        <p className="flex items-center gap-2 text-title text-fg">
          <Store size={18} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
          Nettbutikk
        </p>
        <p className="text-body text-fg-muted">
          AI-hjelp til salg av deler og tilleggstjenester på nett.
        </p>
      </div>

      <CardShell className="flex items-start gap-3 p-6">
        <CircleAlert size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-fg-muted" />
        <div className="flex flex-col gap-1">
          <p className="text-label text-fg">Ikke bygget ennå — og heller ikke besluttet</p>
          <p className="text-body text-fg-muted leading-relaxed">
            Endwise har ingen produkt-, pris- eller lagermodell for varesalg i dag. Før denne flaten
            kan bygges må det avklares om nettbutikk i det hele tatt hører hjemme i produktet, eller
            om det er en integrasjon mot noe forhandleren allerede har.
          </p>
        </div>
      </CardShell>
    </div>
  );
}
