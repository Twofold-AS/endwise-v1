'use client';

import {
  DeaktivertHandling,
  FeltInput,
  FeltSelect,
  FeltTall,
  SelectItem,
  toast,
} from '@endwise/ui';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { OppretterSkuff } from '../_shell/oppretter/oppretter-skuff';
import { SjekkSteg } from '../_shell/oppretter/sjekk-steg';
import { useOppretter } from '../_shell/oppretter/use-oppretter';
import { KompetanseVelger, type ValgtKompetanse } from '../innstillinger/team/_kompetanse-velger';

type Funksjon = 'selger' | 'support' | 'mekaniker' | 'forhandler';

const ROLLER: { verdi: Funksjon; label: string }[] = [
  { verdi: 'mekaniker', label: 'Mekaniker' },
  { verdi: 'selger', label: 'Selger' },
  { verdi: 'support', label: 'Support' },
];

function somFunksjon(verdi: string): Funksjon | null {
  if (
    verdi === 'selger' ||
    verdi === 'support' ||
    verdi === 'mekaniker' ||
    verdi === 'forhandler'
  ) {
    return verdi;
  }
  return null;
}

type Utkast = {
  navn: string;
  epost: string;
  tittel: string;
  funksjon: Funksjon;
  kapasitet: number;
};

const INIT: Utkast = {
  navn: '',
  epost: '',
  tittel: '',
  funksjon: 'mekaniker',
  kapasitet: 1,
};

/**
 * Stegvis «Opprett ansatt»: Identitet → Rolle → Kompetanse → Sjekk.
 * Tilganger er synlig og disabled — ACL kommer senere.
 */
export function OpprettAnsattDialog({ apen, onLukk }: { apen: boolean; onLukk: () => void }) {
  const utils = trpc.useUtils();
  const [kompetanse, setKompetanse] = useState<ValgtKompetanse[]>([]);
  const [kvittering, setKvittering] = useState<string | null>(null);
  const [feil, setFeil] = useState<string | null>(null);
  const o = useOppretter<Utkast>({
    init: INIT,
    lagringsnokkel: 'ansatt',
    steg: [
      {
        id: 'identitet',
        tittel: 'Identitet',
        gyldig: (u) => u.navn.trim().length >= 2 || u.epost.trim().length >= 3,
      },
      { id: 'rolle', tittel: 'Rolle', gyldig: () => true },
      { id: 'kompetanse', tittel: 'Kompetanse', gyldig: () => true, valgfri: true },
      {
        id: 'sjekk',
        tittel: 'Sjekk',
        gyldig: (u) => u.navn.trim().length >= 2 || u.epost.trim().length >= 3,
      },
    ],
  });

  const settKompetanse = trpc.competence.setMechanicSkill.useMutation();

  async function tilordneKompetanse(mechanicId: string) {
    for (const k of kompetanse) {
      await settKompetanse.mutateAsync({
        mechanicId,
        skillKey: k.skillKey,
        level: k.level,
      });
    }
  }

  function ferdig(melding: string) {
    setFeil(null);
    setKompetanse([]);
    setKvittering(melding);
    toast.success(melding);
    o.toem();
    void utils.invitasjoner.list.invalidate();
    void utils.team.list.invalidate();
    void utils.mechanics.list.invalidate();
    void utils.mechanics.oversikt.invalidate();
    void utils.competence.listAllMechanicSkills.invalidate();
  }

  const opprettInvitasjon = trpc.invitasjoner.opprett.useMutation({
    onSuccess: (res) => {
      ferdig(
        res.sendt
          ? `Invitasjon sendt til ${res.epost}.`
          : `Invitasjonen er opprettet for ${res.epost}, men e-posten kunne ikke sendes.`,
      );
    },
    onError: (e) => {
      setKvittering(null);
      setFeil(e.message);
    },
  });

  const opprettLokal = trpc.team.opprettUtenInvitasjon.useMutation({
    onSuccess: async (res) => {
      if (res.mechanicId && kompetanse.length > 0) {
        try {
          await tilordneKompetanse(res.mechanicId);
        } catch (e) {
          setKvittering(null);
          setFeil(e instanceof Error ? e.message : 'Klarte ikke lagre kompetanse.');
          return;
        }
      }
      ferdig(`${res.navn} er lagt til. Ingen invitasjon er sendt — hen kan ikke logge inn ennå.`);
    },
    onError: (e) => {
      setKvittering(null);
      setFeil(e.message);
    },
  });

  function send() {
    const mail = o.utkast.epost.trim();
    const n = o.utkast.navn.trim();
    if (o.utkast.funksjon === 'forhandler') {
      setFeil('Forhandler er den ene admin-kontoen og opprettes ikke her.');
      return;
    }
    if (mail) {
      opprettInvitasjon.mutate({ epost: mail, funksjon: o.utkast.funksjon });
      return;
    }
    if (!n) {
      setFeil('Skriv inn navn når du oppretter uten e-post.');
      return;
    }
    const capacity =
      o.utkast.funksjon === 'mekaniker' && o.utkast.kapasitet >= 1 && o.utkast.kapasitet <= 10
        ? o.utkast.kapasitet
        : 1;
    opprettLokal.mutate({ navn: n, funksjon: o.utkast.funksjon, capacity });
  }

  const venter = opprettInvitasjon.isPending || opprettLokal.isPending || settKompetanse.isPending;
  const rolleLabel = ROLLER.find((r) => r.verdi === o.utkast.funksjon)?.label ?? o.utkast.funksjon;

  return (
    <OppretterSkuff
      tittel="Opprett ansatt"
      apen={apen}
      onLukk={onLukk}
      stegIndeks={o.stegIndeks}
      stegAntall={o.stegAntall}
      stegTittel={o.aktiv?.tittel}
      onTilbake={o.tilbake}
      onNeste={o.neste}
      onOpprett={send}
      kanGaaVidere={o.kanGaaVidere}
      siste={o.siste}
      opprettLabel="Opprett ansatt"
      venter={venter}
    >
      {o.aktiv?.id === 'identitet' ? (
        <div className="flex flex-col gap-3">
          <FeltInput
            label="Navn og etternavn"
            value={o.utkast.navn}
            onChange={(v) => o.oppdater({ navn: v })}
            maxLength={160}
            placeholder="Kari Mekaniker"
          />
          <FeltInput
            label="E-post adresse"
            type="email"
            value={o.utkast.epost}
            onChange={(v) => o.oppdater({ epost: v })}
            placeholder="fornavn@verksted.no"
          />
          <FeltInput
            label="Stillingstittel"
            value={o.utkast.tittel}
            onChange={(v) => o.oppdater({ tittel: v })}
            maxLength={80}
            placeholder="Servicetekniker"
          />
        </div>
      ) : null}
      {o.aktiv?.id === 'rolle' ? (
        <div className="flex flex-col gap-3">
          <FeltSelect
            label="Rolle"
            selectedKey={o.utkast.funksjon}
            onSelectionChange={(key) => {
              const neste = somFunksjon(String(key ?? ''));
              if (neste) o.oppdater({ funksjon: neste });
            }}
          >
            {ROLLER.map((r) => (
              <SelectItem key={r.verdi} id={r.verdi}>
                {r.label}
              </SelectItem>
            ))}
          </FeltSelect>
          <DeaktivertHandling forklaring="Kommer senere">Tilganger</DeaktivertHandling>
          {o.utkast.funksjon === 'mekaniker' ? (
            <FeltTall
              label="Samtidige jobber"
              value={o.utkast.kapasitet}
              minValue={1}
              maxValue={10}
              onChange={(v) => o.oppdater({ kapasitet: Number.isFinite(v) ? v : 1 })}
            />
          ) : null}
        </div>
      ) : null}
      {o.aktiv?.id === 'kompetanse' ? (
        o.utkast.funksjon === 'mekaniker' ? (
          <KompetanseVelger valgte={kompetanse} onEndre={setKompetanse} />
        ) : (
          <p className="text-body text-fg-muted">
            Kompetanse tildeles mekanikere. Velg rollen Mekaniker først.
          </p>
        )
      ) : null}
      {o.aktiv?.id === 'sjekk' ? (
        <SjekkSteg
          rader={[
            { id: 'identitet', etikett: 'Navn', verdi: o.utkast.navn },
            { id: 'identitet', etikett: 'E-post', verdi: o.utkast.epost },
            { id: 'identitet', etikett: 'Stillingstittel', verdi: o.utkast.tittel },
            { id: 'rolle', etikett: 'Rolle', verdi: rolleLabel },
            {
              id: 'kompetanse',
              etikett: 'Kompetanse',
              verdi:
                kompetanse.length === 0 ? 'Ingen' : kompetanse.map((k) => k.skillKey).join(', '),
            },
          ]}
          onEndre={o.gaaTil}
        />
      ) : null}
      {kvittering ? <p className="text-meta text-fg-muted">{kvittering}</p> : null}
      {feil ? (
        <p role="alert" className="text-body text-danger">
          {feil}
        </p>
      ) : null}
    </OppretterSkuff>
  );
}
