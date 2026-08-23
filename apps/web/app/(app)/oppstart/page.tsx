'use client';

import { Inbox, StatefulButton, Store, Wrench } from '@endwise/ui';
import { type FormEvent, useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../_shell/cards';

/**
 * F5-26 — EIER-VEIVISER. Etter passord (invite) og tvungen 2FA.
 *
 * Visningsnavn → (Tillegg bare hvis admin åpnet optional) → Team.
 * ⛔ Ingen avatar-steg. Tomt tilleggssteg vises ikke.
 */
type Funksjon = 'selger' | 'support' | 'mekaniker';
type StegId = 'navn' | 'tillegg' | 'team';

const FUNKSJONER: { verdi: Funksjon; label: string; hint: string; Icon: typeof Store }[] = [
  { verdi: 'selger', label: 'Selger', hint: 'Lander på dashbordet', Icon: Store },
  { verdi: 'support', label: 'Support', hint: 'Lander i innboksen', Icon: Inbox },
  { verdi: 'mekaniker', label: 'Mekaniker', hint: 'Lander på Min dag', Icon: Wrench },
];

export default function OppstartPage() {
  const utils = trpc.useUtils();
  const status = trpc.onboarding.status.useQuery();
  const fullfor = trpc.onboarding.fullfor.useMutation();
  const inviter = trpc.invitasjoner.opprett.useMutation();
  const apne = trpc.invitasjoner.list.useQuery();

  const [steg, setSteg] = useState<StegId>('navn');
  const [navn, setNavn] = useState<string | null>(null);
  const [extras, setExtras] = useState<Set<string>>(new Set());
  const [epost, setEpost] = useState('');
  const [funksjon, setFunksjon] = useState<Funksjon>('selger');
  const [feil, setFeil] = useState<string | null>(null);
  const [kvittering, setKvittering] = useState<string | null>(null);

  const visningsnavn = navn ?? status.data?.visningsnavn ?? '';
  const nivaaNavn = status.data?.nivaa.name ?? 'Start';
  const harTillegg = (status.data?.optional.length ?? 0) > 0;
  const stegRad = useMemo<Array<{ id: StegId; tittel: string }>>(() => {
    const rad: Array<{ id: StegId; tittel: string }> = [{ id: 'navn', tittel: 'Visningsnavn' }];
    if (harTillegg) rad.push({ id: 'tillegg', tittel: 'Tillegg' });
    rad.push({ id: 'team', tittel: 'Team' });
    return rad;
  }, [harTillegg]);

  function toggle(key: string) {
    setExtras((forrige) => {
      const neste = new Set(forrige);
      if (neste.has(key)) neste.delete(key);
      else neste.add(key);
      return neste;
    });
  }

  function etterNavn() {
    setSteg(harTillegg ? 'tillegg' : 'team');
  }

  function tilbakeFraTeam() {
    setSteg(harTillegg ? 'tillegg' : 'navn');
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
    return (
      <div className="mx-auto flex max-w-[640px] flex-col gap-5 px-8 py-7">
        <CardShell className="p-8">
          <p className="text-body text-fg-muted">Vi henter oppstarten…</p>
        </CardShell>
      </div>
    );
  }
  if (status.isError) {
    return (
      <div className="mx-auto flex max-w-[640px] flex-col gap-5 px-8 py-7">
        <CardShell className="p-8">
          <p className="text-body text-danger">{status.error.message}</p>
        </CardShell>
      </div>
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
          {harTillegg
            ? 'Visningsnavn, tillegg som er åpnet for dere, og teamet.'
            : 'Visningsnavn og teamet.'}
        </p>
      </div>

      <ol className="flex gap-2">
        {stegRad.map((s, i) => (
          <li
            key={s.id}
            className={`flex-1 rounded-control px-2 py-1.5 text-center text-[12px] ${
              s.id === steg
                ? 'bg-fg text-bg'
                : stegRad.findIndex((x) => x.id === steg) > i
                  ? 'bg-accent-soft text-fg'
                  : 'bg-surface-2 text-fg-muted'
            }`}
          >
            {s.tittel}
          </li>
        ))}
      </ol>

      {steg === 'navn' ? (
        <CardShell className="flex flex-col gap-4 p-5">
          <div>
            <p className="text-label text-fg">Visningsnavn</p>
            <p className="mt-1 text-[12px] text-fg-muted leading-relaxed">
              Slik navnet vises i sidebaren og for teamet.
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
              onClick={etterNavn}
              className="inline-flex h-control items-center rounded-control bg-fg px-4 text-bg text-label disabled:opacity-40"
            >
              Neste
            </button>
          </div>
        </CardShell>
      ) : null}

      {steg === 'tillegg' && harTillegg ? (
        <CardShell className="flex flex-col gap-4 p-5">
          <div>
            <p className="text-label text-fg">Tillegg</p>
            <p className="mt-1 text-[12px] text-fg-muted leading-relaxed">
              Pakken din er {nivaaNavn}. Disse kan du slå på.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            {status.data?.optional.map((m) => (
              <label key={m.key} className="flex h-row items-center gap-2 text-body text-fg">
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

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setSteg('navn')}
              className="text-[12px] text-fg-muted underline-offset-2 hover:underline"
            >
              Tilbake
            </button>
            <button
              type="button"
              onClick={() => setSteg('team')}
              className="inline-flex h-control items-center rounded-control bg-fg px-4 text-bg text-label"
            >
              Neste
            </button>
          </div>
        </CardShell>
      ) : null}

      {steg === 'team' ? (
        <CardShell className="flex flex-col gap-4 p-5">
          <div>
            <p className="text-label text-fg">Inviter teamet</p>
            <p className="mt-1 text-[12px] text-fg-muted leading-relaxed">
              Selgere, support og mekanikere. De blir ansatte — aldri leder. De setter passord selv
              via e-postlenka.
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
            <StatefulButton
              type="submit"
              disabled={inviter.isPending || !epost.trim()}
              state={inviter.isPending ? 'loading' : inviter.isSuccess ? 'success' : 'idle'}
              loadingText="Sender…"
              successText="Sendt"
            >
              Send invitasjon
            </StatefulButton>
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
              onClick={tilbakeFraTeam}
              className="text-[12px] text-fg-muted underline-offset-2 hover:underline"
            >
              Tilbake
            </button>
            <StatefulButton
              type="button"
              disabled={fullfor.isPending || visningsnavn.trim().length < 2}
              state={fullfor.isPending ? 'loading' : 'idle'}
              loadingText="Lagrer…"
              onClick={() => void avslutt()}
            >
              Fullfør og gå inn
            </StatefulButton>
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
