'use client';

import { DeaktivertHandling, FeltInput } from '@endwise/ui';
import { OppretterSkuff } from './oppretter-skuff';
import { SjekkSteg } from './sjekk-steg';
import { useOppretter } from './use-oppretter';

type Utkast = { navn: string; epost: string; slug: string };

const INIT: Utkast = { navn: '', epost: '', slug: '' };

export function ForhandlerOppretter({ apen, onLukk }: { apen: boolean; onLukk: () => void }) {
  const o = useOppretter<Utkast>({
    init: INIT,
    lagringsnokkel: 'forhandler',
    steg: [
      { id: 'firma', tittel: 'Firma og eier', gyldig: (u) => u.navn.trim().length >= 2 },
      { id: 'pakke', tittel: 'Pakke', gyldig: () => true },
      { id: 'kontor', tittel: 'Kontor', gyldig: () => true, valgfri: true },
      { id: 'sjekk', tittel: 'Sjekk', gyldig: (u) => u.navn.trim().length >= 2 },
    ],
  });

  return (
    <OppretterSkuff
      tittel="Ny forhandler"
      apen={apen}
      onLukk={onLukk}
      stegIndeks={o.stegIndeks}
      stegAntall={o.stegAntall}
      stegTittel={o.aktiv?.tittel}
      onTilbake={o.tilbake}
      onNeste={o.neste}
      onOpprett={() => undefined}
      kanGaaVidere={o.kanGaaVidere}
      siste={o.siste}
      opprettLabel="Opprett forhandler"
      deaktivert
      deaktivertHint="Kommer senere. Bruk den eksisterende forhandlersiden til ekte opprettelse."
    >
      {o.aktiv?.id === 'firma' ? (
        <div className="flex flex-col gap-3">
          <FeltInput
            label="Firmanavn"
            value={o.utkast.navn}
            onChange={(v) => o.oppdater({ navn: v })}
          />
          <FeltInput
            label="Eierens e-post"
            type="email"
            value={o.utkast.epost}
            onChange={(v) => o.oppdater({ epost: v })}
          />
        </div>
      ) : null}
      {o.aktiv?.id === 'pakke' ? (
        <p className="text-body text-fg-muted">
          Start, Pro og Enterprise velges i den eksisterende flyten.
        </p>
      ) : null}
      {o.aktiv?.id === 'kontor' ? (
        <p className="text-body text-fg-muted">
          Adresse og org.nr kan fylles ut senere i Organisasjon.
        </p>
      ) : null}
      {o.aktiv?.id === 'sjekk' ? (
        <>
          <SjekkSteg
            rader={[{ id: 'firma', etikett: 'Firmanavn', verdi: o.utkast.navn }]}
            onEndre={o.gaaTil}
          />
          <DeaktivertHandling forklaring="Kommer senere">Opprett forhandler</DeaktivertHandling>
        </>
      ) : null}
    </OppretterSkuff>
  );
}
