'use client';

import { CircleAlert, Plus, StatefulButton } from '@endwise/ui';
import Image from 'next/image';
import { useState } from 'react';
import type { RouterOutput } from '@/lib/trpc';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../../_shell/cards';
import {
  HELPDESK_KATEGORI_DEFAULT,
  HELPDESK_KATEGORI_LABEL,
  HELPDESK_KATEGORIER,
  helpdeskKategoriLabel,
  type HelpdeskKategori,
} from '../../support/_kategorier';
import { HELPDESK_MIN, hjelpeartikkelLagreHint } from './lagre-hint';

/**
 * F5-23 / F1-07 — ENDWISE-ADMIN: skriv hjelpeartikler.
 *
 * ── ⛔ Hvorfor denne ligger i /endwise og ikke i forhandlerens Settings ────
 * En artikkel som publiseres her dukker opp i sidebaren til ALLE forhandlere.
 * Det er en plattformhandling, ikke en verkstedhandling — samme skille som
 * dev-mode-bryteren (F5-27), som bor her av nøyaktig samme grunn.
 *
 * Ruta bak er `endwiseAdminProcedure`, som er strengere enn `adminProcedure`:
 * den slipper KUN `endwise_admin` inn. En `dealer_admin` er admin i sitt eget
 * verksted og skal ikke kunne skrive til 249 andres. ⚠️ At denne siden ligger
 * i en kontekst forhandlere ikke ser, er kosmetikk — sperren er i ruta.
 *
 * ── ⚠️ BILDER VELGES, DE LASTES IKKE OPP ──────────────────────────────────
 * `packages/uploads` er fortsatt en tom plassholder, og repoet har tre ulike
 * svar på hvor filer skal lagres (techstack §4: Vercel Blob · F2-03: R2 ·
 * F13-03: Vercel + Scaleway). Det er en §2-avklaring for eier, ikke noe å
 * gjette på her. Inntil den er tatt, velges bildet fra de fire som ligger i
 * `apps/web/public/images/`. Selve datamodellen er allerede klar for en URL.
 */
type Artikkel = RouterOutput['helpdesk']['alle'][number];

/** ⚠️ Speiler `HELPDESK_BILDER` i `@endwise/db`. Serveren validerer mot sin. */
const BILDER = ['/images/hero.jpg', '/images/img_1.jpg', '/images/img_2.jpg', '/images/img_3.jpg'];

const TOMT = {
  title: '',
  summary: '',
  body: '',
  image: BILDER[0] as string | null,
  published: false,
  category: HELPDESK_KATEGORI_DEFAULT as HelpdeskKategori,
};

type Skjema = typeof TOMT;

export default function EndwiseHelpdeskPage() {
  const utils = trpc.useUtils();
  const alle = trpc.helpdesk.alle.useQuery(undefined, { retry: false });

  const [redigerer, setRedigerer] = useState<string | null>(null);
  const [skjema, setSkjema] = useState<Skjema>(TOMT);

  const etterSkriving = () => {
    void utils.helpdesk.alle.invalidate();
    /* Lesesidene og sidebaren viser det samme innholdet — begge må hentes på
       nytt, ellers står den gamle tittelen i slideren til cachen løper ut. */
    void utils.helpdesk.list.invalidate();
    void utils.helpdesk.ulesteAntall.invalidate();
  };

  const opprett = trpc.helpdesk.opprett.useMutation({
    onSuccess: () => {
      etterSkriving();
      setRedigerer(null);
      setSkjema(TOMT);
    },
  });
  const oppdater = trpc.helpdesk.oppdater.useMutation({
    onSuccess: () => {
      etterSkriving();
      setRedigerer(null);
    },
  });

  const aktiv = redigerer === 'ny' ? null : (alle.data ?? []).find((a) => a.id === redigerer);
  const lagrer = opprett.isPending || oppdater.isPending;
  const feil = opprett.error ?? oppdater.error;

  function start(a: Artikkel | null) {
    if (a) {
      setRedigerer(a.id);
      setSkjema({
        title: a.title,
        summary: a.summary,
        body: a.body,
        image: a.image,
        published: a.published,
        category: (a.category as HelpdeskKategori) ?? HELPDESK_KATEGORI_DEFAULT,
      });
    } else {
      setRedigerer('ny');
      setSkjema(TOMT);
    }
  }

  function lagre() {
    const felt = {
      title: skjema.title.trim(),
      summary: skjema.summary.trim(),
      body: skjema.body.trim(),
      image: (skjema.image ?? null) as never,
      published: skjema.published,
      category: skjema.category,
    };
    if (redigerer === 'ny') opprett.mutate(felt);
    else if (aktiv) oppdater.mutate({ id: aktiv.id, ...felt });
  }

  const lagreHint = hjelpeartikkelLagreHint(skjema);
  const kanLagre = !lagreHint && !lagrer;

  if (alle.isError) {
    return (
      <div className="mx-auto w-full max-w-[900px] px-8 py-7">
        <CardShell className="flex items-start gap-3 p-6">
          <CircleAlert size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-danger" />
          <p className="text-body text-danger">{alle.error.message}</p>
        </CardShell>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-5 px-8 py-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-title text-fg">Hjelpeartikler</h1>
          <p className="text-body text-fg-muted">
            Publiserte artikler vises hos alle forhandlere — i helpdesken og i sidebaren.
          </p>
        </div>
        {redigerer === null && (
          <button
            type="button"
            onClick={() => start(null)}
            className="inline-flex h-control shrink-0 items-center gap-1.5 rounded-control border border-border px-2.5 text-label text-fg transition-colors hover:bg-surface-2"
          >
            <Plus size={14} strokeWidth={1.75} />
            Ny artikkel
          </button>
        )}
      </div>

      {redigerer !== null && (
        <CardShell className="flex flex-col gap-4 p-5">
          <p className="text-label text-fg">
            {redigerer === 'ny' ? 'Ny artikkel' : `Rediger: ${aktiv?.title ?? ''}`}
          </p>

          <label className="flex flex-col gap-1.5">
            <span className="text-label text-fg">Overskrift</span>
            <input
              value={skjema.title}
              onChange={(e) => setSkjema((s) => ({ ...s, title: e.target.value }))}
              maxLength={120}
              placeholder="Slik fungerer tjenestekatalogen"
              className="h-control rounded-control border border-border bg-bg px-2.5 text-body text-fg outline-none placeholder:text-fg-muted/60 focus-visible:border-fg"
            />
            {/* Eier ba eksplisitt om at overskriften også er den som vises i
                slideren. Den står derfor ett sted og gjenbrukes — ikke to felt
                som kan drifte fra hverandre. */}
            <span className="text-[12px] text-fg-muted">
              Vises både i helpdesken og i slideren nederst i sidebaren.
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-label text-fg">Ingress</span>
              <span className="text-[12px] text-fg-muted tabular-nums">
                {skjema.summary.trim().length}/{HELPDESK_MIN.summary}
              </span>
            </span>
            <textarea
              value={skjema.summary}
              onChange={(e) => setSkjema((s) => ({ ...s, summary: e.target.value }))}
              rows={2}
              maxLength={240}
              placeholder="Én til to setninger. Vises i kortet og i lista."
              className="rounded-control border border-border bg-bg px-2.5 py-2 text-body text-fg outline-none placeholder:text-fg-muted/60 focus-visible:border-fg"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-label text-fg">Kategori</span>
            <div className="flex flex-wrap gap-1.5">
              {HELPDESK_KATEGORIER.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={skjema.category === k}
                  onClick={() => setSkjema((s) => ({ ...s, category: k }))}
                  className={`inline-flex h-7 items-center rounded-pill px-3 text-label transition-colors ${
                    skjema.category === k
                      ? 'bg-fg text-bg'
                      : 'bg-surface-2 text-fg-muted hover:text-fg'
                  }`}
                >
                  {HELPDESK_KATEGORI_LABEL[k]}
                </button>
              ))}
            </div>
            <span className="text-[12px] text-fg-muted">
              Vises som filter hos forhandleren. Brukerguide og Oppdateringer er egne innganger.
            </span>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-label text-fg">Brødtekst</span>
            <textarea
              value={skjema.body}
              onChange={(e) => setSkjema((s) => ({ ...s, body: e.target.value }))}
              rows={10}
              maxLength={20_000}
              placeholder="Skriv i avsnitt. Én blank linje mellom hvert avsnitt."
              className="rounded-control border border-border bg-bg px-2.5 py-2 text-body text-fg outline-none placeholder:text-fg-muted/60 focus-visible:border-fg"
            />
            <span className="text-[12px] text-fg-muted">
              Ren tekst. Blank linje starter et nytt avsnitt — ingen formatering utover det.
            </span>
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-label text-fg">Bilde</span>
            <div className="flex flex-wrap gap-2">
              {BILDER.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setSkjema((s) => ({ ...s, image: b }))}
                  aria-pressed={skjema.image === b}
                  className={`relative h-14 w-24 overflow-hidden rounded-lg border-2 transition-colors ${
                    skjema.image === b ? 'border-fg' : 'border-border hover:border-border-strong'
                  }`}
                >
                  <Image src={b} alt="" fill sizes="96px" className="object-cover" />
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSkjema((s) => ({ ...s, image: null }))}
                aria-pressed={skjema.image === null}
                className={`h-14 w-24 rounded-lg border-2 text-[12px] transition-colors ${
                  skjema.image === null
                    ? 'border-fg text-fg'
                    : 'border-border text-fg-muted hover:border-border-strong'
                }`}
              >
                Uten bilde
              </button>
            </div>
            <span className="text-[12px] text-fg-muted">
              ⚠️ Opplasting er ikke bygget ennå — lagringssted må besluttes først. Inntil da velges
              bildet fra de som ligger i repoet.
            </span>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={skjema.published}
              onChange={(e) => setSkjema((s) => ({ ...s, published: e.target.checked }))}
              className="size-4 accent-[var(--ew-accent)]"
            />
            <span className="text-label text-fg">Publisert</span>
            <span className="text-[12px] text-fg-muted">
              Upublisert = kladd. Teller ikke som ulest hos noen.
            </span>
          </label>

          {feil && (
            <p className="flex items-start gap-2 text-body text-danger">
              <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
              {feil.message}
            </p>
          )}

          <div className="flex flex-col items-end gap-1.5">
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRedigerer(null)}
                className="h-control rounded-control px-3 text-label text-fg-muted transition-colors hover:text-fg"
              >
                Avbryt
              </button>
              <StatefulButton
                type="button"
                onClick={lagre}
                disabled={!kanLagre}
                title={lagreHint ?? undefined}
                aria-describedby={lagreHint ? 'helpdesk-lagre-hint' : undefined}
                state={lagrer ? 'loading' : feil ? 'error' : 'idle'}
                loadingText="Lagrer…"
                successText="Lagret"
                errorText="Feilet"
              >
                {redigerer === 'ny' ? 'Opprett' : 'Lagre'}
              </StatefulButton>
            </div>
            {lagreHint ? (
              <p id="helpdesk-lagre-hint" className="text-[12px] text-fg-muted">
                {lagreHint}
              </p>
            ) : null}
          </div>
        </CardShell>
      )}

      {alle.isLoading ? (
        <p className="py-12 text-center text-body text-fg-muted">Laster …</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          {(alle.data ?? []).map((a, i) => (
            <button
              key={a.id}
              type="button"
              onClick={() => start(a)}
              className={`flex w-full items-center gap-3 bg-bg px-3 py-2.5 text-left transition-colors hover:bg-surface-2 ${
                i > 0 ? 'border-border border-t' : ''
              }`}
            >
              <span className="relative h-10 w-16 shrink-0 overflow-hidden rounded bg-surface-2">
                {a.image && (
                  <Image src={a.image} alt="" fill sizes="64px" className="object-cover" />
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-label text-fg">{a.title}</span>
                <span className="truncate text-[12px] text-fg-muted">
                  {helpdeskKategoriLabel(a.category)} · {a.summary}
                </span>
              </span>
              <span
                className={`inline-flex h-badge shrink-0 items-center rounded-badge px-1.5 text-[11px] ${
                  a.published ? 'bg-success-soft text-success' : 'bg-surface-2 text-fg-muted'
                }`}
              >
                {a.published ? 'Publisert' : 'Kladd'}
              </span>
            </button>
          ))}
          {(alle.data?.length ?? 0) === 0 && (
            <p className="bg-bg px-3 py-8 text-center text-[12px] text-fg-muted">
              Ingen artikler ennå.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
