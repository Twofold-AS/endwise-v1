'use client';

import { DeaktivertHandling, FeltInput, FeltTekst } from '@endwise/ui';
import { OppretterSkuff } from './oppretter-skuff';
import { SjekkSteg } from './sjekk-steg';
import { useOppretter } from './use-oppretter';

const MALER = [
  {
    id: 'workshop',
    tittel: 'Verkstedassistent',
    hjelp: 'Hjelper ansatte med bookinger, lager og kunder.',
  },
  {
    id: 'kunde-support',
    tittel: 'Kundeassistent',
    hjelp: 'Svarer kunder om bookinger og tjenester.',
  },
  {
    id: 'drift-innsikt',
    tittel: 'Driftsinnsikt',
    hjelp: 'Svarer på spørsmål om kapasitet og lager.',
  },
] as const;

type Utkast = { mal: string; navn: string; beskrivelse: string };

const INIT: Utkast = { mal: 'workshop', navn: 'Ronny', beskrivelse: '' };

export function AgentOppretter({ apen, onLukk }: { apen: boolean; onLukk: () => void }) {
  const o = useOppretter<Utkast>({
    init: INIT,
    lagringsnokkel: 'agent',
    steg: [
      { id: 'mal', tittel: 'Mal og navn', gyldig: (u) => u.navn.trim().length >= 2 },
      { id: 'utseende', tittel: 'Utseende', gyldig: () => true, valgfri: true },
      { id: 'tilgang', tittel: 'Hva får den lov til', gyldig: () => true },
      { id: 'sjekk', tittel: 'Sjekk', gyldig: (u) => u.navn.trim().length >= 2 },
    ],
  });

  return (
    <OppretterSkuff
      tittel="Ny assistent"
      apen={apen}
      onLukk={onLukk}
      stegIndeks={o.stegIndeks}
      stegAntall={o.stegAntall}
      stegTittel={o.aktiv?.tittel}
      hjelp={o.aktiv?.hjelp}
      onTilbake={o.tilbake}
      onNeste={o.neste}
      onOpprett={() => undefined}
      kanGaaVidere={o.kanGaaVidere}
      siste={o.siste}
      opprettLabel="Opprett assistent"
      deaktivert
      deaktivertHint="Kommer senere. Assistenten lagres ikke ennå."
    >
      {o.aktiv?.id === 'mal' ? (
        <div className="flex flex-col gap-3">
          <div
            className="flex flex-col gap-2"
            role="radiogroup"
            aria-label="Hva skal assistenten hjelpe med?"
          >
            {MALER.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={o.utkast.mal === m.id}
                onClick={() => o.oppdater({ mal: m.id })}
                className={`rounded-[16px] border px-4 py-3 text-left ${
                  o.utkast.mal === m.id ? 'border-fg bg-sidebar-active' : 'border-border bg-bg'
                }`}
              >
                <span className="block text-body text-fg">{m.tittel}</span>
                <span className="mt-0.5 block text-meta text-fg-muted">{m.hjelp}</span>
              </button>
            ))}
          </div>
          <FeltInput
            label="Navn"
            value={o.utkast.navn}
            onChange={(v) => o.oppdater({ navn: v })}
            maxLength={40}
          />
          <FeltTekst
            label="Kort beskrivelse"
            value={o.utkast.beskrivelse}
            onChange={(v) => o.oppdater({ beskrivelse: String(v) })}
            maxLength={140}
          />
        </div>
      ) : null}
      {o.aktiv?.id === 'utseende' ? (
        <p className="text-body text-fg-muted">
          Farge og uttrykk velges her senere. Ronny beholder sitt ansikt.
        </p>
      ) : null}
      {o.aktiv?.id === 'tilgang' ? (
        <div className="flex flex-col gap-2">
          <p className="text-body text-fg">Hva får den se: bookinger, lager, kunder, mekanikere.</p>
          <DeaktivertHandling forklaring="Kommer senere">Opprette booking</DeaktivertHandling>
          <DeaktivertHandling forklaring="Kommer senere">
            Sende melding til kunde
          </DeaktivertHandling>
        </div>
      ) : null}
      {o.aktiv?.id === 'sjekk' ? (
        <SjekkSteg
          rader={[
            {
              id: 'mal',
              etikett: 'Mal',
              verdi: MALER.find((m) => m.id === o.utkast.mal)?.tittel ?? '',
            },
            { id: 'mal', etikett: 'Navn', verdi: o.utkast.navn },
          ]}
          onEndre={o.gaaTil}
        />
      ) : null}
    </OppretterSkuff>
  );
}
