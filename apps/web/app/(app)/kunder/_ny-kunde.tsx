'use client';

import { CircleAlert, FeltInput, toast } from '@endwise/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { KjoretoyKaskade } from '../bookinger/_kjoretoy-kaskade';
import type { KjoretoyType } from '../bookinger/_kjoretoy-katalog';
import { OppretterSkuff } from '../_shell/oppretter/oppretter-skuff';
import { SjekkSteg } from '../_shell/oppretter/sjekk-steg';
import { useOppretter } from '../_shell/oppretter/use-oppretter';

type Utkast = {
  navn: string;
  telefon: string;
  epost: string;
  leggTilKjoretoy: boolean;
  regnr: string;
  vehType: KjoretoyType;
  vehMerke: string;
  vehModell: string;
  vehAr: string;
};

const INIT: Utkast = {
  navn: '',
  telefon: '',
  epost: '',
  leggTilKjoretoy: false,
  regnr: '',
  vehType: 'mc',
  vehMerke: '',
  vehModell: '',
  vehAr: '',
};

/**
 * Stegvis «Ny kunde»: Kontakt → Kjøretøy → Sjekk.
 */
export function NyKunde({
  apen = true,
  onLukk,
}: {
  apen?: boolean;
  onLukk: () => void;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const o = useOppretter<Utkast>({
    init: INIT,
    lagringsnokkel: 'kunde',
    steg: [
      { id: 'kontakt', tittel: 'Kontakt', gyldig: (u) => u.navn.trim().length >= 2 },
      { id: 'kjoretoy', tittel: 'Kjøretøy', gyldig: () => true, valgfri: true },
      { id: 'sjekk', tittel: 'Sjekk', gyldig: (u) => u.navn.trim().length >= 2 },
    ],
  });

  const alleKjoretoy = trpc.vehicles.list.useQuery({ limit: 200 });
  const opprettKjoretoy = trpc.vehicles.create.useMutation();
  const opprett = trpc.customers.create.useMutation({
    onSuccess: async (kunde) => {
      void utils.customers.list.invalidate();
      toast.success('Kunden er opprettet');
      if (kunde?.id && o.utkast.leggTilKjoretoy && o.utkast.regnr.trim().length >= 2) {
        await opprettKjoretoy.mutateAsync({
          customerId: kunde.id,
          type: o.utkast.vehType,
          regNumber: o.utkast.regnr.trim(),
          make: o.utkast.vehMerke.trim() || undefined,
          model: o.utkast.vehModell.trim() || undefined,
          modelYear: o.utkast.vehAr.trim() || undefined,
        });
        void utils.vehicles.list.invalidate();
      }
      o.toem();
      if (kunde?.id) router.replace(`/kunder/${kunde.id}` as Route);
      else onLukk();
    },
  });

  return (
    <OppretterSkuff
      tittel="Ny kunde"
      apen={apen}
      onLukk={onLukk}
      stegIndeks={o.stegIndeks}
      stegAntall={o.stegAntall}
      stegTittel={o.aktiv?.tittel}
      onTilbake={o.tilbake}
      onNeste={o.neste}
      onOpprett={() =>
        opprett.mutate({
          name: o.utkast.navn.trim(),
          phone: o.utkast.telefon.trim() || undefined,
          email: o.utkast.epost.trim() || undefined,
        })
      }
      kanGaaVidere={o.kanGaaVidere}
      siste={o.siste}
      opprettLabel="Opprett kunde"
      venter={opprett.isPending}
    >
      <div data-ny-kunde className="flex flex-col gap-4">
        {o.aktiv?.id === 'kontakt' ? (
          <>
            <FeltInput
              label="Navn"
              value={o.utkast.navn}
              onChange={(v) => o.oppdater({ navn: v })}
              maxLength={160}
              placeholder="Kari Nordmann"
            />
            <FeltInput
              label="Telefon"
              value={o.utkast.telefon}
              onChange={(v) => o.oppdater({ telefon: v })}
              maxLength={32}
              placeholder="+4790000000"
            />
            <FeltInput
              label="E-post"
              type="email"
              value={o.utkast.epost}
              onChange={(v) => o.oppdater({ epost: v })}
              placeholder="kari@example.no"
            />
          </>
        ) : null}
        {o.aktiv?.id === 'kjoretoy' ? (
          <>
            <button
              type="button"
              onClick={() => o.oppdater({ leggTilKjoretoy: !o.utkast.leggTilKjoretoy })}
              className="inline-flex h-12 w-full items-center justify-center rounded-pill border border-border text-body text-fg"
            >
              {o.utkast.leggTilKjoretoy ? 'Fjern kjøretøy' : 'Legg til kjøretøy'}
            </button>
            {o.utkast.leggTilKjoretoy ? (
              <div data-parent-park="veh" className="flex flex-col gap-3">
                <FeltInput
                  label="Regnr"
                  value={o.utkast.regnr}
                  onChange={(v) => o.oppdater({ regnr: v.toUpperCase() })}
                  placeholder="EK12345"
                />
                <KjoretoyKaskade
                  type={o.utkast.vehType}
                  merke={o.utkast.vehMerke}
                  modell={o.utkast.vehModell}
                  ar={o.utkast.vehAr}
                  rader={alleKjoretoy.data ?? []}
                  onType={(v) => o.oppdater({ vehType: v })}
                  onMerke={(v) => o.oppdater({ vehMerke: v })}
                  onModell={(v) => o.oppdater({ vehModell: v })}
                  onAr={(v) => o.oppdater({ vehAr: v })}
                />
              </div>
            ) : (
              <p className="text-meta text-fg-muted">Valgfritt. Kan legges til på kunden senere.</p>
            )}
          </>
        ) : null}
        {o.aktiv?.id === 'sjekk' ? (
          <SjekkSteg
            rader={[
              { id: 'kontakt', etikett: 'Navn', verdi: o.utkast.navn },
              { id: 'kontakt', etikett: 'Telefon', verdi: o.utkast.telefon },
              { id: 'kontakt', etikett: 'E-post', verdi: o.utkast.epost },
              {
                id: 'kjoretoy',
                etikett: 'Kjøretøy',
                verdi: o.utkast.leggTilKjoretoy
                  ? [o.utkast.regnr, o.utkast.vehMerke, o.utkast.vehModell]
                      .filter(Boolean)
                      .join(' · ')
                  : 'Ingen',
              },
            ]}
            onEndre={o.gaaTil}
          />
        ) : null}
        {opprett.error ? (
          <p className="flex items-start gap-2 text-body text-danger">
            <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            {opprett.error.message}
          </p>
        ) : null}
      </div>
    </OppretterSkuff>
  );
}
