'use client';

import { CircleAlert, Inbox, type LucideIcon, Store, Wrench } from '@endwise/ui';
import { type FormEvent, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../../_shell/cards';

/**
 * F1-10 — INVITER EN ANSATT. Lederens flate.
 *
 * ── ⚠️ Knappene her er kosmetikk ─────────────────────────────────────────
 * Sperren er `invitasjoner.opprett`: `adminProcedure` + eksplisitt rollesjekk +
 * funksjonsvalidering i modulen + CHECK-constraint i basen. En `dealer_staff`
 * som kaller ruta direkte får `FORBIDDEN`, uansett hva nettleseren viser.
 *
 * ── Hva lederen KAN velge, og hva hen ikke kan ───────────────────────────
 * Kun jobbfunksjon (F1-14). **Tilgangsnivået er alltid `dealer_staff`** og
 * finnes ikke som felt — å invitere noen rett til admin er en annen og langt
 * farligere handling, og skal ikke skje fra en nedtrekksliste som handler om
 * hva folk jobber med.
 *
 * ⛔ Tokenet vises ALDRI her. Det finnes i lenka som sendes på e-post, og bare
 * der. Lista under viser hvem som er invitert — ikke hvordan man blir dem.
 */
type Funksjon = 'selger' | 'support' | 'mekaniker';

const FUNKSJONER: { verdi: Funksjon; label: string; hint: string; icon: LucideIcon }[] = [
  { verdi: 'selger', label: 'Selger', hint: 'Lander på dashbordet', icon: Store },
  { verdi: 'support', label: 'Support', hint: 'Lander i innboksen', icon: Inbox },
  { verdi: 'mekaniker', label: 'Mekaniker', hint: 'Lander på Min dag', icon: Wrench },
];

export function Inviter() {
  const utils = trpc.useUtils();
  const apne = trpc.invitasjoner.list.useQuery();
  const [epost, setEpost] = useState('');
  const [funksjon, setFunksjon] = useState<Funksjon>('selger');
  const [kvittering, setKvittering] = useState<string | null>(null);
  const [feil, setFeil] = useState<string | null>(null);

  const opprett = trpc.invitasjoner.opprett.useMutation({
    onSuccess: (res) => {
      setFeil(null);
      setEpost('');
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

  const tilbakekall = trpc.invitasjoner.tilbakekall.useMutation({
    onSuccess: () => {
      setKvittering('Invitasjonen er tilbakekalt. Lenken virker ikke lenger.');
      void utils.invitasjoner.list.invalidate();
    },
    onError: (e) => setFeil(e.message),
  });

  function send(event: FormEvent) {
    event.preventDefault();
    if (!epost.trim()) return;
    opprett.mutate({ epost: epost.trim(), funksjon });
  }

  const venter = opprett.isPending;

  return (
    <CardShell className="flex flex-col gap-4 p-4">
      <div>
        <p className="text-label text-fg">Inviter en ansatt</p>
        <p className="mt-1 text-[12px] text-fg-muted leading-relaxed">
          Den ansatte får en personlig lenke på e-post, setter sitt eget passord og tofaktor, og
          lander der jobben deres begynner. Tilgangsnivået blir alltid <b>ansatt</b> — ikke leder.
        </p>
      </div>

      <form onSubmit={send} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="inv-epost" className="text-label text-fg">
            E-post
          </label>
          <input
            id="inv-epost"
            type="email"
            required
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
            disabled={venter || !epost.trim()}
            className="inline-flex h-control items-center rounded-control bg-fg px-4 text-label text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {venter ? 'Sender …' : 'Send invitasjon'}
          </button>
          {kvittering ? <p className="text-[12px] text-fg-muted">{kvittering}</p> : null}
        </div>

        {feil ? (
          <p role="alert" className="text-[12px] text-destructive">
            {feil}
          </p>
        ) : null}
      </form>

      {/* ── Åpne invitasjoner ───────────────────────────────────────────── */}
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
