'use client';

import { CircleAlert, FeltInput, FilterChips, toast } from '@endwise/ui';
import { trpc } from '@/lib/trpc';
import { OppretterSkuff } from '../../_shell/oppretter/oppretter-skuff';
import { SjekkSteg } from '../../_shell/oppretter/sjekk-steg';
import { useOppretter } from '../../_shell/oppretter/use-oppretter';
import { type Kjoretoytype, parsePris, TYPE_VALG } from './_felles';
import { TjenesteFelter, TOMME_FELTER, type Versjonsfelter } from './_felter';

type Utkast = {
  navn: string;
  type: Kjoretoytype;
  felter: Versjonsfelter;
};

const INIT: Utkast = { navn: '', type: 'mc', felter: TOMME_FELTER };

const TYPE_TEKST: Record<Kjoretoytype, string> = {
  mc: 'Motorsykkel',
  boat: 'Båt',
  atv: 'ATV',
};

/**
 * Stegvis «Ny tjeneste»: Hva → Pris og tid → Sjekk.
 */
export function NyTjeneste({
  apen = true,
  onLukk,
}: {
  apen?: boolean;
  onLukk: () => void;
}) {
  const utils = trpc.useUtils();
  const o = useOppretter<Utkast>({
    init: INIT,
    lagringsnokkel: 'tjeneste',
    steg: [
      { id: 'hva', tittel: 'Hva', gyldig: (u) => u.navn.trim().length >= 2 },
      {
        id: 'pris',
        tittel: 'Pris og tid',
        gyldig: (u) => {
          const v = Number(u.felter.varighet);
          return Number.isFinite(v) && v >= 5 && v <= 480;
        },
      },
      { id: 'sjekk', tittel: 'Sjekk', gyldig: (u) => u.navn.trim().length >= 2 },
    ],
  });

  const opprett = trpc.services.create.useMutation({
    onSuccess: () => {
      void utils.services.list.invalidate();
      toast.success('Tjenesten er opprettet');
      o.toem();
      onLukk();
    },
  });

  const pris = parsePris(o.utkast.felter.pris);

  return (
    <OppretterSkuff
      tittel="Ny tjeneste"
      apen={apen}
      onLukk={onLukk}
      stegIndeks={o.stegIndeks}
      stegAntall={o.stegAntall}
      stegTittel={o.aktiv?.tittel}
      onTilbake={o.tilbake}
      onNeste={o.neste}
      onOpprett={() => {
        if (!pris.ok) return;
        const varighet = Number(o.utkast.felter.varighet);
        opprett.mutate({
          name: o.utkast.navn.trim(),
          vehicleType: o.utkast.type,
          durationMinutes: Math.round(varighet),
          priceMinor: pris.ore,
          skills: o.utkast.felter.ferdigheter,
          description: o.utkast.felter.beskrivelse.trim() || undefined,
        });
      }}
      kanGaaVidere={o.kanGaaVidere && (o.aktiv?.id !== 'sjekk' || pris.ok)}
      siste={o.siste}
      opprettLabel="Opprett tjeneste"
      venter={opprett.isPending}
    >
      <div data-ny-tjeneste className="flex flex-col gap-4">
        {o.aktiv?.id === 'hva' ? (
          <>
            <FeltInput
              label="Navn"
              value={o.utkast.navn}
              onChange={(v) => o.oppdater({ navn: v })}
              maxLength={120}
              placeholder="EU-kontroll MC"
            />
            <div className="flex flex-col gap-1.5">
              <p className="text-label text-fg">Gjelder</p>
              <FilterChips
                chips={TYPE_VALG}
                valgt={o.utkast.type}
                onChange={(type) => o.oppdater({ type })}
                ariaLabel="Kjøretøytype"
              />
              <p className="text-meta text-fg-muted">Kan ikke endres senere.</p>
            </div>
          </>
        ) : null}
        {o.aktiv?.id === 'pris' ? (
          <TjenesteFelter
            verdier={o.utkast.felter}
            onEndre={(felter) => o.oppdater({ felter })}
          />
        ) : null}
        {o.aktiv?.id === 'sjekk' ? (
          <SjekkSteg
            rader={[
              { id: 'hva', etikett: 'Navn', verdi: o.utkast.navn },
              { id: 'hva', etikett: 'Gjelder', verdi: TYPE_TEKST[o.utkast.type] },
              { id: 'pris', etikett: 'Varighet', verdi: `${o.utkast.felter.varighet} min` },
              {
                id: 'pris',
                etikett: 'Pris',
                verdi: o.utkast.felter.pris ? `${o.utkast.felter.pris} kr` : 'Ikke satt',
              },
            ]}
            onEndre={o.gaaTil}
          />
        ) : null}
        {(opprett.error || (o.siste && !pris.ok)) && (
          <p className="flex items-start gap-2 text-body text-danger">
            <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            {!pris.ok ? pris.feil : opprett.error?.message}
          </p>
        )}
      </div>
    </OppretterSkuff>
  );
}
