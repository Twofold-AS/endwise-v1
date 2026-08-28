'use client';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@endwise/ui';
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

const FELT =
  'h-control rounded-control border border-border bg-bg px-3 text-body text-fg outline-none placeholder:text-fg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:bg-surface-2 disabled:text-fg-muted';

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
    <Dialog
      open={apen}
      onOpenChange={(o) => {
        if (!o) onLukk();
      }}
    >
      <DialogContent className="top-1/2 left-1/2 max-h-[min(90dvh,720px)] w-[min(440px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-5">
        <DialogTitle className="text-title text-fg">Opprett ansatt</DialogTitle>
        <DialogDescription className="mt-1 text-body text-fg-muted">
          Med e-post får hen invitasjon og setter passord og tofaktor. Uten e-post vises hen i
          teamet uten innlogging.
        </DialogDescription>

        <form onSubmit={send} className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-label text-fg">Navn og etternavn</span>
            <input
              value={navn}
              onChange={(e) => setNavn(e.target.value)}
              maxLength={160}
              placeholder="Kari Mekaniker"
              className={FELT}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-label text-fg">E-post adresse</span>
            <input
              type="email"
              value={epost}
              onChange={(e) => setEpost(e.target.value)}
              placeholder="fornavn@verksted.no"
              className={FELT}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-label text-fg">Jobb tittel</span>
            <input
              value={tittel}
              onChange={(e) => setTittel(e.target.value)}
              maxLength={80}
              placeholder="Servicetekniker"
              className={FELT}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-label text-fg">Rolle</span>
            <select
              value={funksjon}
              onChange={(e) => {
                const neste = somFunksjon(e.target.value);
                if (neste) setFunksjon(neste);
              }}
              className={FELT}
            >
              {ROLLER.map((r) => (
                <option key={r.verdi} value={r.verdi}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-label text-fg">Tilganger</span>
            <select disabled className={FELT} aria-disabled="true" value="standard">
              <option value="standard">Standard — tilpasses senere</option>
            </select>
          </label>

          {funksjon === 'mekaniker' ? (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-label text-fg">Samtidige jobber</span>
                <input
                  inputMode="numeric"
                  value={kapasitet}
                  onChange={(e) => setKapasitet(e.target.value)}
                  className={FELT}
                />
              </label>
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
      </DialogContent>
    </Dialog>
  );
}
