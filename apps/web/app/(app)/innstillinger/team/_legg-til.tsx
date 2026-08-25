'use client';

import { CircleAlert, Inbox, type LucideIcon, Store, Wrench } from '@endwise/ui';
import { type FormEvent, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../../_shell/cards';

/**
 * F1-10 tillegg — LEGG TIL ANSATT UTEN INVITASJON.
 *
 * For verksted som ikke trenger mekaniker-PWA, eller som vil ha personen i
 * forhandlervisningen før noen logger inn. Ingen e-post sendes. Invitasjons-
 * stien over er uendret.
 *
 * ⚠️ Sperren er `team.opprettUtenInvitasjon` (`adminProcedure` + rollesjekk).
 * Knappene her er kosmetikk.
 */
type Funksjon = 'selger' | 'support' | 'mekaniker';

const FUNKSJONER: { verdi: Funksjon; label: string; hint: string; icon: LucideIcon }[] = [
  { verdi: 'selger', label: 'Selger', hint: 'Vises i teamet. Ingen innlogging.', icon: Store },
  { verdi: 'support', label: 'Support', hint: 'Vises i teamet. Ingen innlogging.', icon: Inbox },
  {
    verdi: 'mekaniker',
    label: 'Mekaniker',
    hint: 'Vises på saker og mekanikerlista',
    icon: Wrench,
  },
];

export function LeggTilUtenInvitasjon() {
  const utils = trpc.useUtils();
  const [navn, setNavn] = useState('');
  const [epost, setEpost] = useState('');
  const [funksjon, setFunksjon] = useState<Funksjon>('mekaniker');
  const [kvittering, setKvittering] = useState<string | null>(null);
  const [feil, setFeil] = useState<string | null>(null);

  const opprett = trpc.team.opprettUtenInvitasjon.useMutation({
    onSuccess: (res) => {
      setFeil(null);
      setNavn('');
      setEpost('');
      setKvittering(
        res.funksjon === 'mekaniker'
          ? `${res.navn} er lagt til som mekaniker. Ingen invitasjon er sendt.`
          : `${res.navn} er lagt til i teamet. Ingen invitasjon er sendt.`,
      );
      void utils.team.list.invalidate();
      void utils.mechanics.list.invalidate();
      void utils.mechanics.oversikt.invalidate();
    },
    onError: (e) => {
      setKvittering(null);
      setFeil(e.message);
    },
  });

  function send(event: FormEvent) {
    event.preventDefault();
    const n = navn.trim();
    if (!n) return;
    opprett.mutate({
      navn: n,
      epost: epost.trim() || undefined,
      funksjon,
    });
  }

  const venter = opprett.isPending;

  return (
    <CardShell className="flex flex-col gap-4 p-4">
      <div>
        <p className="text-label text-fg">Legg til uten invitasjon</p>
        <p className="mt-1 text-[12px] text-fg-muted leading-relaxed">
          Personen vises i forhandlervisningen med en gang. Ingen e-post sendes, og hen kan ikke
          logge inn. Skal hen inn i Endwise, bruk invitasjonen over.
        </p>
      </div>

      <form onSubmit={send} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lokal-navn" className="text-label text-fg">
            Navn
          </label>
          <input
            id="lokal-navn"
            required
            value={navn}
            onChange={(e) => setNavn(e.target.value)}
            maxLength={160}
            placeholder="Kari Mekaniker"
            className="h-control rounded-control border border-border bg-bg px-3 text-body text-fg outline-none placeholder:text-fg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="lokal-epost" className="text-label text-fg">
            E-post <span className="font-normal text-fg-muted">(valgfri)</span>
          </label>
          <input
            id="lokal-epost"
            type="email"
            value={epost}
            onChange={(e) => setEpost(e.target.value)}
            placeholder="fornavn@verksted.no"
            className="h-control rounded-control border border-border bg-bg px-3 text-body text-fg outline-none placeholder:text-fg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>

        <fieldset className="flex flex-col gap-1.5 border-0 p-0">
          <legend className="p-0 text-label text-fg">Jobbfunksjon</legend>
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

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={venter || !navn.trim()}
            className="inline-flex h-control items-center rounded-control bg-fg px-4 text-label text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {venter ? 'Legger til …' : 'Legg til ansatt'}
          </button>
          {kvittering ? <p className="text-[12px] text-fg-muted">{kvittering}</p> : null}
        </div>

        {feil ? (
          <p role="alert" className="flex items-start gap-2 text-[12px] text-destructive">
            <CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden />
            {feil}
          </p>
        ) : null}
      </form>
    </CardShell>
  );
}
