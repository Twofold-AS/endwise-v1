'use client';

import { Inbox, Store, Wrench } from '@endwise/ui';
import { type FormEvent, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../_shell/cards';

/**
 * F5-26 — EIER-VEIVISER. Etter passord (invite) og tvungen 2FA.
 *
 * 1. Visningsnavn
 * 2. Valgfrie tillegg — KUN nøkler admin merket optional. Ikke hele katalogen.
 * 3. Team — staff-invitasjoner (F1-10). Aldri leder/dealer_admin.
 *
 * Inkludert pakke er allerede skrevet. Hopper du over tillegg, står den.
 */
type Funksjon = 'selger' | 'support' | 'mekaniker';

const FUNKSJONER: { verdi: Funksjon; label: string; hint: string; Icon: typeof Store }[] = [
  { verdi: 'selger', label: 'Selger', hint: 'Lander på dashbordet', Icon: Store },
  { verdi: 'support', label: 'Support', hint: 'Lander i innboksen', Icon: Inbox },
  { verdi: 'mekaniker', label: 'Mekaniker', hint: 'Lander på Min dag', Icon: Wrench },
];

const STEG = ['Visningsnavn', 'Tillegg', 'Team'] as const;

export default function OppstartPage() {
  const utils = trpc.useUtils();
  const status = trpc.onboarding.status.useQuery();
  const fullfor = trpc.onboarding.fullfor.useMutation();
  const inviter = trpc.invitasjoner.opprett.useMutation();
  const apne = trpc.invitasjoner.list.useQuery();

  const [steg, setSteg] = useState(0);
  const [navn, setNavn] = useState<string | null>(null);
  const [extras, setExtras] = useState<Set<string>>(new Set());
  const [epost, setEpost] = useState('');
  const [funksjon, setFunksjon] = useState<Funksjon>('selger');
  const [feil, setFeil] = useState<string | null>(null);
  const [kvittering, setKvittering] = useState<string | null>(null);

  const visningsnavn = navn ?? status.data?.visningsnavn ?? '';

  function toggle(key: string) {
    setExtras((forrige) => {
      const neste = new Set(forrige);
      if (neste.has(key)) neste.delete(key);
      else neste.add(key);
      return neste;
    });
  }

  async function sendAnsatt(event: FormEvent) {
    event.preventDefault();
    setFeil(null);
    setKvittering(null);
    try {
      const res = await inviter.mutateAsync({ epost: epost.trim(), funksjon });
      setEpost('');
      setKvittering(
        res.sendt
          ? `Invitasjon sendt til ${res.epost}.`
          : `Invitasjonen er opprettet for ${res.epost}, men e-posten nådde ikke fram.`,
      );
      void utils.invitasjoner.list.invalidate();
    } catch (error) {
      setFeil((error as Error).message);
    }
  }

  async function avslutt() {
    setFeil(null);
    try {
      await fullfor.mutateAsync({
        visningsnavn: visningsnavn.trim(),
        extras: [...extras],
      });
      void utils.session.me.invalidate();
      window.location.assign('/dashboard');
    } catch (error) {
      setFeil((error as Error).message);
    }
  }

  if (status.isLoading) {
    return <p className="px-8 py-10 text-body text-fg-muted">Laster oppstarten …</p>;
  }
  if (status.isError) {
    return (
      <p className="px-8 py-10 text-body text-danger">{status.error.message}</p>
    );
  }
  if (status.data?.complete) {
    return (
      <div className="mx-auto flex max-w-[560px] flex-col gap-3 px-8 py-10">
        <h1 className="text-title text-fg">Oppstarten er ferdig</h1>
        <p className="text-body text-fg-muted">Du kan gå videre til verkstedet.</p>
        <a
          href="/dashboard"
          className="inline-flex h-control w-fit items-center rounded-control bg-fg px-4 text-bg text-label"
        >
          Til oversikten
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="text-title text-fg">Velkommen til Endwise</h1>
        <p className="text-body text-fg-muted">
          Tre steg: hvordan verkstedet vises, eventuelle tillegg Mikael åpnet for dere, og
          hvem som skal med på laget.
        </p>
      </div>

      <ol className="flex gap-2">
        {STEG.map((tittel, i) => (
          <li
            key={tittel}
            className={`flex-1 rounded-control px-2 py-1.5 text-center text-[12px] ${
              i === steg
                ? 'bg-fg text-bg'
                : i < steg
                  ? 'bg-accent-soft text-fg'
                  : 'bg-surface-2 text-fg-muted'
            }`}
          >
            {i + 1}. {tittel}
          </li>
        ))}
      </ol>

      {steg === 0 ? (
        <CardShell className="flex flex-col gap-4 p-5">
          <div>
            <p className="text-label text-fg">Visningsnavn</p>
            <p className="mt-1 text-[12px] text-fg-muted leading-relaxed">
              Slik navnet vises i sidebaren og for teamet. Du styrer det — ikke vi.
            </p>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-label text-fg">Navn på verkstedet</span>
            <input
              value={visningsnavn}
              onChange={(e) => setNavn(e.target.value)}
              minLength={2}
              className="h-control rounded-control border border-border bg-bg px-3 text-body text-fg outline-none focus-visible:border-fg"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={visningsnavn.trim().length < 2}
              onClick={() => setSteg(1)}
              className="inline-flex h-control items-center rounded-control bg-fg px-4 text-bg text-label disabled:opacity-40"
            >
              Neste
            </button>
          </div>
        </CardShell>
      ) : null}

      {steg === 1 ? (
        <CardShell className="flex flex-col gap-4 p-5">
          <div>
            <p className="text-label text-fg">Tillegg i pakken</p>
            <p className="mt-1 text-[12px] text-fg-muted leading-relaxed">
              Dette har du allerede. Basis (Verkstedet, Innboks, Saker …) er alltid på.
            </p>
          </div>
          {(status.data?.included.length ?? 0) === 0 ? (
            <p className="text-[12px] text-fg-muted">Ingen ekstra tillegg i den faste pakken.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {status.data?.included.map((m) => (
                <li key={m.key} className="text-body text-fg">
                  {m.label}
                </li>
              ))}
            </ul>
          )}

          <div className="border-border border-t pt-3">
            <p className="text-label text-fg">Valgfritt — bare det som er åpnet for dere</p>
            <p className="mt-1 text-[12px] text-fg-muted leading-relaxed">
              Du handler ikke fra hele katalogen. Nettbutikk og SMS er ikke tillegg.
            </p>
          </div>
          {(status.data?.optional.length ?? 0) === 0 ? (
            <p className="text-[12px] text-fg-muted">Ingen valgfrie tillegg i denne pakken.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {status.data?.optional.map((m) => (
                <label key={m.key} className="flex items-center gap-2 text-body text-fg">
                  <input
                    type="checkbox"
                    checked={extras.has(m.key) || m.enabled}
                    disabled={m.enabled}
                    onChange={() => toggle(m.key)}
                    className="size-4 accent-[#111]"
                  />
                  {m.label}
                </label>
              ))}
            </div>
          )}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setSteg(0)}
              className="text-[12px] text-fg-muted underline-offset-2 hover:underline"
            >
              Tilbake
            </button>
            <button
              type="button"
              onClick={() => setSteg(2)}
              className="inline-flex h-control items-center rounded-control bg-fg px-4 text-bg text-label"
            >
              Neste
            </button>
          </div>
        </CardShell>
      ) : null}

      {steg === 2 ? (
        <CardShell className="flex flex-col gap-4 p-5">
          <div>
            <p className="text-label text-fg">Inviter teamet</p>
            <p className="mt-1 text-[12px] text-fg-muted leading-relaxed">
              Selgere, support og mekanikere. De blir ansatte — aldri leder. De setter passord
              selv via e-postlenka.
            </p>
          </div>

          <form onSubmit={sendAnsatt} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-label text-fg">E-post</span>
              <input
                type="email"
                value={epost}
                onChange={(e) => setEpost(e.target.value)}
                placeholder="fornavn@verksted.no"
                className="h-control rounded-control border border-border bg-bg px-3 text-body text-fg outline-none placeholder:text-fg-muted focus-visible:border-fg"
              />
            </label>
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
                      className={`flex min-h-row items-center gap-2 rounded-control border px-3 text-left ${
                        valgt
                          ? 'border-accent-strong bg-accent-soft text-accent-strong'
                          : 'border-border text-fg hover:bg-surface-2'
                      }`}
                    >
                      <f.Icon size={16} className="shrink-0" aria-hidden />
                      <span className="flex flex-col">
                        <span className="text-label">{f.label}</span>
                        <span className="text-[11px] opacity-80">{f.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <button
              type="submit"
              disabled={inviter.isPending || !epost.trim()}
              className="inline-flex h-control w-fit items-center rounded-control border border-border px-4 text-label text-fg disabled:opacity-40"
            >
              {inviter.isPending ? 'Sender …' : 'Send invitasjon'}
            </button>
          </form>

          {kvittering ? <p className="text-[12px] text-fg-muted">{kvittering}</p> : null}

          {(apne.data?.length ?? 0) > 0 ? (
            <ul className="flex flex-col border-border border-t pt-3">
              {apne.data?.map((i) => (
                <li key={i.id} className="flex justify-between py-1 text-body text-fg">
                  <span>{i.epost}</span>
                  <span className="text-[12px] text-fg-muted">{i.funksjon}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setSteg(1)}
              className="text-[12px] text-fg-muted underline-offset-2 hover:underline"
            >
              Tilbake
            </button>
            <button
              type="button"
              disabled={fullfor.isPending || visningsnavn.trim().length < 2}
              onClick={() => void avslutt()}
              className="inline-flex h-control items-center rounded-control bg-fg px-4 text-bg text-label disabled:opacity-40"
            >
              {fullfor.isPending ? 'Lagrer …' : 'Fullfør og gå inn'}
            </button>
          </div>
        </CardShell>
      ) : null}

      {feil ? (
        <p role="alert" className="text-body text-destructive">
          {feil}
        </p>
      ) : null}
    </div>
  );
}
