'use client';

import {
  FeltInput,
  FeltSelect,
  FeltTall,
  Modal,
  ModalBody,
  ModalHeader,
  SelectItem,
} from '@endwise/ui';
import { type FormEvent, useState } from 'react';
import { trpc } from '@/lib/trpc';
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

/**
 * Opprett ansatt som dialog. Gjenbruker invitasjon / team.opprett.
 * Tilganger er synlig og disabled — ACL kommer senere.
 */
export function OpprettAnsattDialog({ apen, onLukk }: { apen: boolean; onLukk: () => void }) {
  const utils = trpc.useUtils();
  const [navn, setNavn] = useState('');
  const [epost, setEpost] = useState('');
  const [tittel, setTittel] = useState('');
  const [funksjon, setFunksjon] = useState<Funksjon>('mekaniker');
  const [kapasitet, setKapasitet] = useState('1');
  const [kompetanse, setKompetanse] = useState<ValgtKompetanse[]>([]);
  const [kvittering, setKvittering] = useState<string | null>(null);
  const [feil, setFeil] = useState<string | null>(null);

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
    setNavn('');
    setEpost('');
    setTittel('');
    setKompetanse([]);
    setKapasitet('1');
    setKvittering(melding);
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

  function send(event: FormEvent) {
    event.preventDefault();
    const mail = epost.trim();
    const n = navn.trim();
    if (funksjon === 'forhandler') {
      setFeil('Forhandler er den ene admin-kontoen og opprettes ikke her.');
      return;
    }
    if (mail) {
      opprettInvitasjon.mutate({ epost: mail, funksjon });
      return;
    }
    if (!n) {
      setFeil('Skriv inn navn når du oppretter uten e-post.');
      return;
    }
    const tall = Number(kapasitet);
    const capacity =
      funksjon === 'mekaniker' && Number.isInteger(tall) && tall >= 1 && tall <= 10 ? tall : 1;
    opprettLokal.mutate({ navn: n, funksjon, capacity });
  }

  const venter = opprettInvitasjon.isPending || opprettLokal.isPending || settKompetanse.isPending;
  const kanSende = Boolean(epost.trim() || navn.trim());

  return (
    <Modal
      isOpen={apen}
      onOpenChange={(o) => {
        if (!o) onLukk();
      }}
      size="md"
    >
      <ModalHeader
        title="Opprett ansatt"
        description="Med e-post får hen invitasjon og setter passord og tofaktor. Uten e-post vises hen i teamet uten innlogging."
      />
      <ModalBody>
        <form onSubmit={send} className="mt-4 flex flex-col gap-3">
          <FeltInput
            label="Navn og etternavn"
            value={navn}
            onChange={setNavn}
            maxLength={160}
            placeholder="Kari Mekaniker"
          />
          <FeltInput
            label="E-post adresse"
            type="email"
            value={epost}
            onChange={setEpost}
            placeholder="fornavn@verksted.no"
          />
          <FeltInput
            label="Jobb tittel"
            value={tittel}
            onChange={setTittel}
            maxLength={80}
            placeholder="Servicetekniker"
          />
          <FeltSelect
            label="Rolle"
            selectedKey={funksjon}
            onSelectionChange={(key) => {
              const neste = somFunksjon(String(key ?? ''));
              if (neste) setFunksjon(neste);
            }}
          >
            {ROLLER.map((r) => (
              <SelectItem key={r.verdi} id={r.verdi}>
                {r.label}
              </SelectItem>
            ))}
          </FeltSelect>
          <FeltSelect label="Tilganger" selectedKey="standard" isDisabled>
            <SelectItem id="standard">Standard — tilpasses senere</SelectItem>
          </FeltSelect>

          {funksjon === 'mekaniker' ? (
            <>
              <FeltTall
                label="Samtidige jobber"
                value={Number(kapasitet) || 1}
                minValue={1}
                maxValue={10}
                onChange={(v) => setKapasitet(Number.isFinite(v) ? String(v) : '1')}
              />
              <KompetanseVelger valgte={kompetanse} onEndre={setKompetanse} />
            </>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onLukk}
              className="h-control rounded-control px-3 text-label text-fg-muted"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={venter || !kanSende}
              className="inline-flex h-control items-center rounded-control bg-fg px-4 text-label text-bg disabled:opacity-40"
            >
              {venter ? 'Lagrer …' : 'Opprett ansatt'}
            </button>
          </div>
          {kvittering ? <p className="text-[12px] text-fg-muted">{kvittering}</p> : null}
          {feil ? (
            <p role="alert" className="text-[12px] text-destructive">
              {feil}
            </p>
          ) : null}
        </form>
      </ModalBody>
    </Modal>
  );
}
