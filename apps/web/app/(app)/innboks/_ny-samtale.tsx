'use client';

import { CircleAlert, LifeBuoy, type LucideIcon, StatefulButton, Users, Wrench } from '@endwise/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../_shell/cards';
import { KANAL, type Kanal } from './_kanal';
import type { ThreadKind } from './_lib';

/**
 * F6-01 / F5-30 — «NY SAMTALE». Hullet som blokkerte alt annet.
 *
 * `messages.createThread` har eksistert i backend siden F6-01 og virket hele
 * tiden. **Ingen flate kalte den.** Quick action «Ny melding» pekte på
 * `/innboks?ny=1`, og den parameteren ble ikke lest av noe. Det gjorde at man
 * ikke kunne starte en samtale i det hele tatt — heller ikke med seg selv,
 * som er nettopp det dev-mode skal gjøre mulig å teste.
 *
 * ── ⚠️ Deltakere: det ærlige forbeholdet ──────────────────────────────────
 * `directory.participants` (08.08.2026) oversetter en ID til et navn, men det
 * finnes fortsatt **ingen rute som LISTER brukerne i tenanten**. Oppslaget er
 * bevisst enveis — se doc-kommentaren i `routers/directory.ts`: en rute som
 * kunne ramse opp personer er et større hull enn en som bekrefter navn på IDer
 * du allerede har. Derfor kan dette skjemaet ikke tilby en personvelger ennå.
 *
 * Det den kan:
 *   · **Bare meg** — en tråd der du er eneste deltaker.
 *   · **Legg til bruker-ID-er** manuelt, for den som har dem.
 *
 * ⛔ **«Bare meg» tester IKKE sanntid.** `postMessage` hopper over forfatteren
 * når den publiserer (`if (p.participantId === input.authorId) continue` i
 * `messages/threads.ts`) — du skal ikke få et varsel om din egen melding. Er du
 * eneste deltaker, publiseres det altså ingenting, og det andre vinduet står
 * stille til noe annet henter på nytt. Ekte SSE-test krever **to forskjellige
 * brukere** i samme tenant.
 *
 * Serveren legger alltid deg selv til som deltaker (`createThread`), så en tom
 * liste er gyldig og betyr «bare meg».
 */
const PARTER: { key: ThreadKind; label: string; hint: string; icon: LucideIcon }[] = [
  {
    key: 'customer_dealer',
    label: 'Kunder',
    hint: 'Kunde ↔ forhandler',
    icon: Users,
  },
  {
    key: 'mechanic_dealer',
    label: 'Intern',
    hint: 'Mekaniker ↔ forhandler',
    icon: Wrench,
  },
  {
    key: 'dealer_admin',
    label: 'Endwise',
    hint: 'Forhandler ↔ oss',
    icon: LifeBuoy,
  },
];

export function NySamtale({ onLukk }: { onLukk: () => void }) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [part, setPart] = useState<ThreadKind>('dealer_admin');
  const [kanal, setKanal] = useState<Kanal>('app');
  const [emne, setEmne] = useState('');
  const [deltakere, setDeltakere] = useState('');
  const [eksternRef, setEksternRef] = useState('');

  const opprett = trpc.messages.createThread.useMutation({
    onSuccess: (tråd) => {
      void utils.messages.listThreads.invalidate();
      const id = (tråd as { id?: string } | null)?.id;
      if (id) router.replace(`/innboks/${id}` as Route);
      else onLukk();
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    opprett.mutate({
      kind: part,
      channel: kanal,
      externalRef: kanal === 'app' ? undefined : eksternRef.trim() || undefined,
      subject: emne.trim() || undefined,
      // Tom liste er ugyldig i input-skjemaet (min(1)), men serveren legger
      // uansett til deg selv — så «bare meg» sendes som nettopp deg selv.
      participantIds: deltakere
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    });
  }

  return (
    <CardShell className="p-5">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <p className="text-label text-fg">Ny samtale</p>
          <p className="text-[12px] text-fg-muted">
            Uten deltakere blir det en tråd med deg selv. Sanntid krever to forskjellige brukere —
            du varsles aldri om dine egne meldinger.
          </p>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-label text-fg">Hvem er samtalen med?</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {PARTER.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPart(p.key)}
                aria-pressed={part === p.key}
                className={`flex flex-col items-start gap-0.5 rounded-control border px-3 py-2.5 text-left transition-colors ${
                  part === p.key
                    ? 'border-fg bg-sidebar-active'
                    : 'border-border hover:bg-surface-2'
                }`}
              >
                <span className="flex items-center gap-2 text-label text-fg">
                  <p.icon size={16} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
                  {p.label}
                </span>
                <span className="text-[12px] text-fg-muted">{p.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {/* ── Kanal = svarkanal ─────────────────────────────────────────────
            Valget her avgjør hvor svarene skal ut, ikke bare hvordan tråden
            ser ut. Derfor står forbeholdet under: utsendingen finnes ikke ennå. */}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-label text-fg">Kanal</legend>
          <div className="flex flex-wrap gap-2">
            {(['app', 'sms', 'email', 'web'] as const).map((k) => {
              const spek = KANAL[k];
              const Ikon = spek.icon;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKanal(k)}
                  aria-pressed={kanal === k}
                  title={spek.hint}
                  className={`inline-flex h-control items-center gap-1.5 rounded-control border px-3 text-label transition-colors ${
                    kanal === k
                      ? 'border-fg bg-sidebar-active text-fg'
                      : 'border-border text-fg-muted hover:bg-surface-2'
                  }`}
                >
                  <Ikon size={14} strokeWidth={1.75} className="shrink-0" />
                  {spek.label}
                </button>
              );
            })}
          </div>
          {kanal !== 'app' && (
            <>
              <label className="mt-1 flex flex-col gap-1.5">
                <span className="text-label text-fg">
                  {kanal === 'sms'
                    ? 'Telefonnummer'
                    : kanal === 'email'
                      ? 'E-postadresse'
                      : 'Ekstern referanse'}
                </span>
                <input
                  value={eksternRef}
                  onChange={(e) => setEksternRef(e.target.value)}
                  maxLength={320}
                  placeholder={kanal === 'sms' ? '+4790000000' : 'kunde@example.no'}
                  className="h-control rounded-control border border-border bg-bg px-2.5 text-body text-fg outline-none placeholder:text-fg-muted/60 focus-visible:border-fg"
                />
              </label>
              {/**
               * ⚠️ Teksten er OPPDATERT 22.08.2026, ikke fjernet. Utgående
               * e-post virker nå (F6-26), men SMS gjør det ikke, og innkommende
               * gjør det ikke for noen av dem (F6-27). Et forbehold som ble
               * stående uendret ville løyet motsatt vei — «ingenting sendes» er
               * like galt som «alt virker» når bare halvparten stemmer.
               */}
              <p className="flex items-start gap-1.5 text-[11px] text-fg-muted leading-relaxed">
                <CircleAlert size={13} strokeWidth={1.75} className="mt-0.5 shrink-0" />
                {kanal === 'email' ? (
                  <span>
                    Meldinger du skriver i denne tråden <b>sendes som e-post</b> til adressen over.
                    Kundens svar kommer ikke inn i Endwise ennå (F6-27) — svar går til din egen
                    e-post, så du ser dem der.
                  </span>
                ) : (
                  <span>
                    Kanalen lagres og vises i innboksen, men utsending over {KANAL[kanal].label} er
                    ikke koblet på ennå. Meldingene blir liggende i Endwise til den er det.
                  </span>
                )}
              </p>
            </>
          )}
        </fieldset>

        <label className="flex flex-col gap-1.5">
          <span className="text-label text-fg">Emne</span>
          <input
            value={emne}
            onChange={(e) => setEmne(e.target.value)}
            maxLength={140}
            placeholder="Valgfritt"
            className="h-control rounded-control border border-border bg-bg px-2.5 text-body text-fg outline-none placeholder:text-fg-muted/60 focus-visible:border-fg"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-label text-fg">Deltakere (bruker-ID-er)</span>
          <input
            value={deltakere}
            onChange={(e) => setDeltakere(e.target.value)}
            placeholder="La stå tom for «bare meg»"
            className="h-control rounded-control border border-border bg-bg px-2.5 font-mono text-[12px] text-fg outline-none placeholder:font-sans placeholder:text-fg-muted/60 focus-visible:border-fg"
          />
          <span className="text-[12px] text-fg-muted">
            Ingen personvelger ennå. Navn på IDer virker (<code>directory.participants</code>), men
            ingen rute lister brukerne i tenanten — det er et bevisst valg, ikke en glemsel.
          </span>
        </label>

        {opprett.error && (
          <p className="flex items-start gap-2 text-body text-danger">
            <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            {opprett.error.message}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onLukk}
            className="h-control rounded-control px-3 text-label text-fg-muted transition-colors hover:text-fg"
          >
            Avbryt
          </button>
          <StatefulButton
            type="submit"
            disabled={opprett.isPending}
            state={
              opprett.isPending
                ? 'loading'
                : opprett.isError
                  ? 'error'
                  : opprett.isSuccess
                    ? 'success'
                    : 'idle'
            }
            loadingText="Oppretter…"
            successText="Opprettet"
            errorText="Feilet"
          >
            Start samtale
          </StatefulButton>
        </div>
      </form>
    </CardShell>
  );
}
