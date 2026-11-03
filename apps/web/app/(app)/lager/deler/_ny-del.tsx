'use client';

import { FeltInput, FeltTall, toast } from '@endwise/ui';
import { trpc } from '@/lib/trpc';
import { OppretterSkuff } from '../../_shell/oppretter/oppretter-skuff';
import { SjekkSteg } from '../../_shell/oppretter/sjekk-steg';
import { useOppretter } from '../../_shell/oppretter/use-oppretter';

type Utkast = { sku: string; navn: string; min: number };

const INIT: Utkast = { sku: '', navn: '', min: 0 };

/** Stegvis «Ny del»: Del → Minimum → Sjekk. */
export function NyDel({
  apen = true,
  onFerdig,
}: {
  apen?: boolean;
  onFerdig: () => void;
}) {
  const utils = trpc.useUtils();
  const o = useOppretter<Utkast>({
    init: INIT,
    lagringsnokkel: 'del',
    steg: [
      {
        id: 'del',
        tittel: 'Del',
        gyldig: (u) => u.sku.trim().length >= 1 && u.navn.trim().length >= 2,
      },
      { id: 'minimum', tittel: 'Minimum', gyldig: () => true, valgfri: true },
      {
        id: 'sjekk',
        tittel: 'Sjekk',
        gyldig: (u) => u.sku.trim().length >= 1 && u.navn.trim().length >= 2,
      },
    ],
  });

  const opprett = trpc.inventory.createPart.useMutation({
    onSuccess: () => {
      void utils.inventory.listParts.invalidate();
      void utils.inventory.summary.invalidate();
      toast.success('Delen er lagt inn');
      o.toem();
      onFerdig();
    },
  });

  return (
    <OppretterSkuff
      tittel="Ny del"
      apen={apen}
      onLukk={onFerdig}
      stegIndeks={o.stegIndeks}
      stegAntall={o.stegAntall}
      stegTittel={o.aktiv?.tittel}
      onTilbake={o.tilbake}
      onNeste={o.neste}
      onOpprett={() =>
        opprett.mutate({
          sku: o.utkast.sku.trim(),
          name: o.utkast.navn.trim(),
          minStock: o.utkast.min > 0 ? o.utkast.min : undefined,
        })
      }
      kanGaaVidere={o.kanGaaVidere}
      siste={o.siste}
      opprettLabel="Opprett del"
      venter={opprett.isPending}
    >
      <div data-ny-del className="flex flex-col gap-4">
        {o.aktiv?.id === 'del' ? (
          <>
            <FeltInput
              label="Delenummer"
              value={o.utkast.sku}
              onChange={(v) => o.oppdater({ sku: v })}
              placeholder="OLJE-5W40"
            />
            <FeltInput
              label="Navn"
              value={o.utkast.navn}
              onChange={(v) => o.oppdater({ navn: v })}
              placeholder="Motorolje 5W-40"
            />
          </>
        ) : null}
        {o.aktiv?.id === 'minimum' ? (
          <FeltTall
            label="Minimum på lager"
            value={o.utkast.min}
            minValue={0}
            onChange={(v) => o.oppdater({ min: Number.isFinite(v) ? v : 0 })}
          />
        ) : null}
        {o.aktiv?.id === 'sjekk' ? (
          <SjekkSteg
            rader={[
              { id: 'del', etikett: 'Delenummer', verdi: o.utkast.sku },
              { id: 'del', etikett: 'Navn', verdi: o.utkast.navn },
              { id: 'minimum', etikett: 'Minimum', verdi: String(o.utkast.min) },
            ]}
            onEndre={o.gaaTil}
          />
        ) : null}
        {opprett.isError ? <p className="text-body text-danger">{opprett.error.message}</p> : null}
      </div>
    </OppretterSkuff>
  );
}
