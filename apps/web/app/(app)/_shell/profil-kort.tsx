'use client';

import { BellRing, CircleAlert, CircleUser, StatefulButton, Volume2, VolumeX } from '@endwise/ui';
import { type FormEvent, useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useLyd } from '../_lib/lyd';
import { CardShell } from './cards';

/**
 * F5-19 / F7-06 — EGEN PROFIL: navn, kallenavn og varslingslyder.
 *
 * ⚠️ **Én komponent, to steder.** Den vises både i forhandlerens
 * Settings › Profil og i mekanikerens «Meg»-fane. To kopier ville før eller
 * siden fått hver sin variant av av/på-knappen, og da er det ikke lenger den
 * samme innstillingen — bare to som ser like ut.
 */
export function ProfilKort() {
  const utils = trpc.useUtils();
  const lyd = useLyd();
  const meg = trpc.profile.meg.useQuery();

  const [navn, setNavn] = useState('');
  const [kallenavn, setKallenavn] = useState('');

  // Skjemaet fylles fra serveren ÉN gang per lasting. Skriver brukeren i
  // feltet mens en refetch lander, skal det ikke bli overskrevet under fingrene.
  useEffect(() => {
    if (meg.data) {
      setNavn(meg.data.navn);
      setKallenavn(meg.data.kallenavn ?? '');
    }
  }, [meg.data]);

  const lagreNavn = trpc.profile.setName.useMutation({
    onSuccess: () => {
      void utils.profile.meg.invalidate();
      void utils.session.me.invalidate();
      lyd.suksess();
    },
    onError: () => lyd.feil(),
  });

  const lagreKallenavn = trpc.profile.setNickname.useMutation({
    onSuccess: () => {
      void utils.profile.meg.invalidate();
      void utils.session.me.invalidate();
      void utils.directory.participants.invalidate();
      lyd.suksess();
    },
    onError: () => lyd.feil(),
  });

  const settLyd = trpc.profile.setNotificationSounds.useMutation({
    onSuccess: (res) => {
      void utils.profile.meg.invalidate();
      void utils.session.me.invalidate();
      // Prøvelyd KUN når den skrus PÅ. En bekreftelseslyd på «av» ville vært
      // en vits på brukerens bekostning.
      if (res.pa) lyd.test();
    },
  });

  if (meg.isLoading) {
    return <p className="px-1 py-6 text-body text-fg-muted">Laster profil …</p>;
  }
  if (meg.isError || !meg.data) {
    return (
      <CardShell className="flex items-start gap-3 p-4">
        <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-danger" />
        <p className="text-body text-danger">
          Kunne ikke hente profilen: {meg.error?.message ?? 'ukjent feil'}
        </p>
      </CardShell>
    );
  }

  const d = meg.data;
  const lydPa = d.varslingslyder;

  function submitNavn(e: FormEvent) {
    e.preventDefault();
    const v = navn.trim();
    if (v.length < 2 || v === d.navn) return;
    lagreNavn.mutate({ navn: v });
  }

  function submitKallenavn(e: FormEvent) {
    e.preventDefault();
    lagreKallenavn.mutate({ kallenavn: kallenavn.trim() });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Hvem du er ───────────────────────────────────────────────── */}
      <CardShell>
        <div className="flex items-center gap-3 p-4">
          <CircleUser size={24} className="shrink-0 text-fg-muted" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-label text-fg">{d.navn || '—'}</span>
            <span className="truncate text-[12px] text-fg-muted">{d.epost}</span>
          </div>
        </div>
      </CardShell>

      {/* ══ VARSLINGSLYDER — den store, tydelige bryteren ══════════════ */}
      <section className="flex flex-col gap-2">
        <h2 className="text-label text-fg">Varslingslyder</h2>
        {/*
          ⚠️ Bevisst STOR og full bredde, ikke en liten switch i en tabellrad.
          Eier ba om «meget tydelig av/på» — og det er riktig krav: en lyd som
          spiller uten at du vet hvor den kommer fra, og som du ikke finner
          bryteren til, er verre enn ingen lyd.
        */}
        <button
          type="button"
          onClick={() => settLyd.mutate({ pa: !lydPa })}
          disabled={settLyd.isPending}
          aria-pressed={lydPa}
          className={`flex w-full items-center gap-4 rounded-xl border-2 px-4 py-4 text-left transition-colors ${
            lydPa
              ? 'border-accent-strong bg-accent-soft'
              : 'border-border bg-surface-2 hover:border-border-strong'
          }`}
        >
          <span
            className={`grid size-11 shrink-0 place-items-center rounded-control ${
              lydPa ? 'bg-bg text-accent-strong' : 'bg-bg text-fg-muted'
            }`}
          >
            {lydPa ? (
              <Volume2 size={20} strokeWidth={1.75} />
            ) : (
              <VolumeX size={20} strokeWidth={1.75} />
            )}
          </span>

          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className={`text-label ${lydPa ? 'text-accent-strong' : 'text-fg'}`}>
              Varslingslyder er {lydPa ? 'PÅ' : 'AV'}
            </span>
            <span className="text-[12px] text-fg-muted">
              {lydPa
                ? 'En kort lyd når det kommer en ny melding. Trykk for å skru av.'
                : 'Ingen lyd ved nye meldinger. Trykk for å skru på.'}
            </span>
          </span>

          {/* Selve bryteren. Ren CSS på token-laget — samme høyde som `h-control`. */}
          <span
            aria-hidden
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              lydPa ? 'bg-accent-strong' : 'bg-border-strong'
            }`}
          >
            <span
              className={`absolute top-0.5 size-5 rounded-full bg-bg transition-all ${
                lydPa ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </span>
        </button>

        <p className="flex items-start gap-1.5 text-[11px] text-fg-muted leading-relaxed">
          <BellRing size={13} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          Gjelder deg, på alle forhandlere du er medlem av. Lyden spilles kun for meldinger fra
          andre — aldri for dine egne.
        </p>

        {lyd.pa && (
          <button
            type="button"
            onClick={() => lyd.test()}
            className="self-start text-[12px] text-fg-muted underline underline-offset-2 hover:text-fg"
          >
            Spill prøvelyd
          </button>
        )}
      </section>

      {/* ── Visningsnavn ─────────────────────────────────────────────── */}
      <section className="flex flex-col gap-2">
        <h2 className="text-label text-fg">Visningsnavn</h2>
        <CardShell className="p-4">
          <form onSubmit={submitNavn} className="flex items-start gap-2">
            <input
              value={navn}
              onChange={(e) => setNavn(e.target.value)}
              minLength={2}
              maxLength={80}
              aria-label="Visningsnavn"
              className="h-control min-w-0 flex-1 rounded-control border border-border bg-bg px-2.5 text-body text-fg outline-none focus-visible:border-fg"
            />
            <StatefulButton
              type="submit"
              disabled={navn.trim().length < 2 || navn.trim() === d.navn || lagreNavn.isPending}
              state={
                lagreNavn.isPending
                  ? 'loading'
                  : lagreNavn.isError
                    ? 'error'
                    : lagreNavn.isSuccess
                      ? 'success'
                      : 'idle'
              }
              loadingText="Lagrer…"
              successText="Lagret"
              errorText="Feilet"
            >
              Lagre
            </StatefulButton>
          </form>
          {lagreNavn.error && (
            <p className="mt-2 text-body text-danger">{lagreNavn.error.message}</p>
          )}
          <p className="mt-2 text-[11px] text-fg-muted">
            Dette er navnet andre ser. Det gjelder overalt — også hos andre forhandlere du er medlem
            av.
          </p>
        </CardShell>
      </section>

      {/* ══ KALLENAVN — kun for private/ansatt-profiler ════════════════ */}
      {d.kanHaKallenavn ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-label text-fg">Kallenavn</h2>
          <CardShell className="p-4">
            <form onSubmit={submitKallenavn} className="flex items-start gap-2">
              <input
                value={kallenavn}
                onChange={(e) => setKallenavn(e.target.value)}
                maxLength={24}
                placeholder="F.eks. «Skiftenøkkelen»"
                aria-label="Kallenavn"
                className="h-control min-w-0 flex-1 rounded-control border border-border bg-bg px-2.5 text-body text-fg outline-none placeholder:text-fg-muted/60 focus-visible:border-fg"
              />
              <StatefulButton
                type="submit"
                disabled={lagreKallenavn.isPending || kallenavn.trim() === (d.kallenavn ?? '')}
                state={
                  lagreKallenavn.isPending
                    ? 'loading'
                    : lagreKallenavn.isError
                      ? 'error'
                      : lagreKallenavn.isSuccess
                        ? 'success'
                        : 'idle'
                }
                loadingText="Lagrer…"
                successText="Lagret"
                errorText="Feilet"
              >
                Lagre
              </StatefulButton>
            </form>
            {lagreKallenavn.error && (
              <p className="mt-2 text-body text-danger">{lagreKallenavn.error.message}</p>
            )}

            {/* ⛔ Grensen står i klartekst. Ikke fordi brukeren har lyst til å
                bryte den, men fordi hun skal vite hvor den går før hun skriver
                noe hun ikke vil at en kunde skal se — og så oppdager at det
                var trygt likevel. */}
            <div className="mt-3 flex items-start gap-2 rounded-control bg-surface-2 p-3">
              <CircleAlert size={14} strokeWidth={1.75} className="mt-0.5 shrink-0 text-fg-muted" />
              <p className="text-[11px] text-fg-muted leading-relaxed">
                Kallenavnet vises <strong className="text-fg">kun internt</strong> — i intern chat
                og i mekanikervisningen. Mot kunder brukes alltid det ekte navnet ditt. La feltet
                stå tomt for å fjerne kallenavnet.
              </p>
            </div>
          </CardShell>
        </section>
      ) : (
        /* Admin-kontoer får ikke feltet — og får vite hvorfor, i stedet for at
           det bare mangler. Et fravær uten forklaring leses som en feil. */
        <section className="flex flex-col gap-2">
          <h2 className="text-label text-fg">Kallenavn</h2>
          <CardShell className="flex items-start gap-3 p-4">
            <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-fg-muted" />
            <p className="text-[12px] text-fg-muted leading-relaxed">
              Kallenavn er for private profiler — mekanikere og ansatte. Denne kontoen er
              forhandlerens offisielle konto, og den skal alltid opptre med sitt ekte navn.
            </p>
          </CardShell>
        </section>
      )}
    </div>
  );
}
