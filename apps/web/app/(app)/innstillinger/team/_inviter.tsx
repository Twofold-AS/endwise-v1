'use client';

import { CircleAlert, Inbox, type LucideIcon, Store, Wrench } from '@endwise/ui';
import { type FormEvent, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../../_shell/cards';
import { KompetanseVelger, type ValgtKompetanse } from './_kompetanse-velger';

/**
 * «Opprett ansatt» på egen pille.
 * Med e-post: eksisterende invitasjonsflyt (`invitasjoner.opprett`).
 * Uten e-post: `team.opprettUtenInvitasjon` — vises i teamet, ingen mail.
 * Kompetanse og `mechanics.capacity` (samtidige jobber) gjenbrukes fra
 * Kompetanse-/Timeplan-flatene. Ingen nye felt eller roller.
 * Knappene er kosmetikk. Sperren er adminProcedure + rollesjekk.
 */
type Funksjon = 'selger' | 'support' | 'mekaniker';

const FUNKSJONER: { verdi: Funksjon; label: string; hint: string; icon: LucideIcon }[] = [
  { verdi: 'selger', label: 'Selger', hint: 'Lander på dashbordet', icon: Store },
  { verdi: 'support', label: 'Support', hint: 'Lander i innboksen', icon: Inbox },
  { verdi: 'mekaniker', label: 'Mekaniker', hint: 'Lander på Min dag', icon: Wrench },
];

export function OpprettAnsatt() {
  const utils = trpc.useUtils();
  const apne = trpc.invitasjoner.list.useQuery();
  const [navn, setNavn] = useState('');
  const [epost, setEpost] = useState('');
  const [funksjon, setFunksjon] = useState<Funksjon>('selger');
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

  const opprettInvitasjon = trpc.invitasjoner.opprett.useMutation({
    onSuccess: (res) => {
      setFeil(null);
      setNavn('');
      setEpost('');
      setKompetanse([]);
      setKapasitet('1');
      setKvittering(
        res.sendt
          ? `Invitasjon sendt til ${res.epost}.`
          : `Invitasjonen er opprettet for ${res.epost}, men e-posten kunne ikke sendes. Sjekk oppsettet, eller tilbakekall og prøv igjen.`,
      );
      void utils.invitasjoner.list.invalidate();
    },
    onError: (e) => {
      setKvittering(null);
      setFeil(e.message);
    },
  });

  const opprettLokal = trpc.team.opprettUtenInvitasjon.useMutation({
    onSuccess: async (res) => {
      setFeil(null);
      if (res.mechanicId && kompetanse.length > 0) {
        try {
          await tilordneKompetanse(res.mechanicId);
        } catch (e) {
          setKvittering(null);
          setFeil(e instanceof Error ? e.message : 'Klarte ikke lagre kompetanse.');
          return;
        }
      }
      setNavn('');
      setEpost('');
      setKompetanse([]);
      setKapasitet('1');
      setKvittering(
        `${res.navn} er lagt til. Ingen invitasjon er sendt — hen kan ikke logge inn ennå.`,
      );
      void utils.team.list.invalidate();
      void utils.mechanics.list.invalidate();
      void utils.mechanics.oversikt.invalidate();
      void utils.competence.listAllMechanicSkills.invalidate();
    },
    onError: (e) => {
      setKvittering(null);
      setFeil(e.message);
    },
  });

  const tilbakekall = trpc.invitasjoner.tilbakekall.useMutation({
    onSuccess: () => {
      setKvittering('Invitasjonen er tilbakekalt. Lenken virker ikke lenger.');
      void utils.invitasjoner.list.invalidate();
    },
    onError: (e) => setFeil(e.message),
  });

  function send(event: FormEvent) {
    event.preventDefault();
    const mail = epost.trim();
    const n = navn.trim();
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
    <CardShell className="flex flex-col gap-4 p-4">
      <div>
        <p className="text-label text-fg">Opprett ansatt</p>
        <p className="mt-1 text-[12px] text-fg-muted leading-relaxed">
          E-post er valgfri. Med e-post får hen en invitasjon og setter selv passord og tofaktor.
          Uten e-post vises hen i teamet uten innlogging. Tilgangsnivået blir alltid <b>ansatt</b>.
        </p>
      </div>

      <form onSubmit={send} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="opprett-navn" className="text-label text-fg">
            Navn <span className="font-normal text-fg-muted">(påkrevd uten e-post)</span>
          </label>
          <input
            id="opprett-navn"
            value={navn}
            onChange={(e) => setNavn(e.target.value)}
            maxLength={160}
            placeholder="Kari Mekaniker"
            className="h-control rounded-control border border-border bg-bg px-3 text-body text-fg outline-none placeholder:text-fg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="opprett-epost" className="text-label text-fg">
            E-post <span className="font-normal text-fg-muted">(valgfri)</span>
          </label>
          <input
            id="opprett-epost"
            type="email"
            value={epost}
            onChange={(e) => setEpost(e.target.value)}
            placeholder="fornavn@verksted.no"
            className="h-control rounded-control border border-border bg-bg px-3 text-body text-fg outline-none placeholder:text-fg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>

        <fieldset className="flex flex-col gap-1.5 border-0 p-0">
          <legend className="p-0 text-label text-fg">Rolle</legend>
          <div className="flex flex-wrap gap-2">
            {FUNKSJONER.map((f) => {
              const valgt = funksjon === f.verdi;
              return (
                <button
                  key={f.verdi}
                  type="button"
                  onClick={() => setFunksjon(f.verdi)}
                  aria-pressed={valgt}
                  className={`flex min-h-row items-center gap-2 rounded-control border px-3 text-left transition-colors ${
                    valgt
                      ? 'border-accent-strong bg-accent-soft text-accent-strong'
                      : 'border-border text-fg hover:bg-surface-2'
                  }`}
                >
                  <f.icon size={16} className="shrink-0" aria-hidden />
                  <span className="flex flex-col">
                    <span className="text-label">{f.label}</span>
                    <span className="text-[11px] opacity-80">{f.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {funksjon === 'mekaniker' ? (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-label text-fg">Samtidige jobber</span>
              <span className="text-[12px] text-fg-muted">
                Samme felt som Timeplan — hvor mange jobber hen kan ha samtidig.
              </span>
              <input
                inputMode="numeric"
                value={kapasitet}
                onChange={(e) => setKapasitet(e.target.value)}
                className="h-control rounded-control border border-border bg-bg px-3 text-body text-fg outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </label>
            <KompetanseVelger valgte={kompetanse} onEndre={setKompetanse} />
          </>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={venter || !kanSende}
            className="inline-flex h-control items-center rounded-control bg-fg px-4 text-label text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {venter ? 'Lagrer …' : 'Opprett ansatt'}
          </button>
          {kvittering ? <p className="text-[12px] text-fg-muted">{kvittering}</p> : null}
        </div>

        {feil ? (
          <p role="alert" className="text-[12px] text-destructive">
            {feil}
          </p>
        ) : null}
      </form>

      {apne.data && apne.data.length > 0 ? (
        <div className="flex flex-col gap-2 border-border border-t pt-3">
          <p className="text-label text-fg">Åpne invitasjoner</p>
          <ul className="flex flex-col">
            {apne.data.map((i, idx) => (
              <li
                key={i.id}
                className={`flex flex-wrap items-center gap-x-3 gap-y-1 py-2 ${idx > 0 ? 'border-border border-t' : ''}`}
              >
                <span className="min-w-0 flex-1 truncate text-body text-fg">{i.epost}</span>
                <span className="shrink-0 rounded-badge bg-surface-2 px-2 text-[11px] text-fg-muted">
                  {i.funksjon}
                </span>
                <span className="shrink-0 text-[12px] text-fg-muted">
                  utløper {new Date(i.utloper).toLocaleDateString('nb-NO')}
                </span>
                <button
                  type="button"
                  onClick={() => tilbakekall.mutate({ id: i.id })}
                  disabled={tilbakekall.isPending}
                  className="shrink-0 text-[12px] text-fg-muted underline underline-offset-2 hover:text-destructive disabled:opacity-40"
                >
                  Tilbakekall
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {apne.data && apne.data.length === 0 ? (
        <p className="flex items-center gap-2 border-border border-t pt-3 text-[12px] text-fg-muted">
          <CircleAlert size={14} className="shrink-0" aria-hidden />
          Ingen åpne invitasjoner.
        </p>
      ) : null}
    </CardShell>
  );
}
