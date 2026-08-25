'use client';

import {
  Avatar,
  CircleAlert,
  CircleUser,
  Inbox,
  type LucideIcon,
  ShieldCheck,
  Store,
  Wrench,
} from '@endwise/ui';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../../_shell/cards';

/**
 * F1-14 — JOBBFUNKSJON per ansatt. Lederens flate.
 *
 * ── ⛔ To dimensjoner, og skjermen må ikke blande dem ────────────────────
 * Kolonnen «Tilgang» viser `member.role` og er **ikke redigerbar her** — å
 * bytte noens tilgangsnivå er en annen og langt farligere handling enn å si hva
 * de jobber med. Kolonnen «Funksjon» er den som kan endres.
 *
 * Sto de i samme nedtrekksliste, ville en leder som ville gjøre noen til
 * «support» før eller siden gitt bort admin-rettigheter ved et uhell.
 *
 * ⚠️ Knappene her er KOSMETIKK. Sperren er `team.setFunction`, som er
 * `adminProcedure` + eksplisitt rollesjekk + medlemskapssjekk på målpersonen.
 * En dealer_staff som kaller ruta direkte får `FORBIDDEN`, uansett hva
 * nettleseren viser.
 */
type Funksjon = 'leder' | 'selger' | 'support' | 'mekaniker';

const FUNKSJON: Record<Funksjon, { label: string; hint: string; icon: LucideIcon; tone: string }> =
  {
    leder: {
      label: 'Leder',
      hint: 'Styrer innstillinger, abonnement og team',
      icon: ShieldCheck,
      tone: 'bg-accent-soft text-accent-strong',
    },
    selger: {
      label: 'Selger',
      hint: 'Booking, kunder og salg. Lander på Dashboard',
      icon: Store,
      tone: 'bg-surface-2 text-fg-muted',
    },
    support: {
      label: 'Support',
      hint: 'Kundeinnboksen. Lander på Innboks',
      icon: Inbox,
      tone: 'bg-surface-2 text-fg-muted',
    },
    mekaniker: {
      label: 'Mekaniker',
      hint: 'Mobilvisning. Lander på Min dag',
      icon: Wrench,
      tone: 'bg-warn-soft text-warn',
    },
  };

/** Kun disse kan tildeles. `leder` følger av tilgangsnivået — se ruteren. */
type Tildelbar = 'selger' | 'support' | 'mekaniker';
const VALGBARE: Tildelbar[] = ['selger', 'support', 'mekaniker'];

export function Funksjoner() {
  const utils = trpc.useUtils();
  const team = trpc.team.list.useQuery();

  const sett = trpc.team.setFunction.useMutation({
    onSuccess: () => {
      void utils.team.list.invalidate();
      void utils.session.me.invalidate();
    },
  });

  if (team.isLoading) {
    return <p className="px-1 py-6 text-body text-fg-muted">Laster team …</p>;
  }
  if (team.isError) {
    return (
      <CardShell className="flex items-start gap-3 p-4">
        <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-danger" />
        <p className="text-body text-danger">{team.error.message}</p>
      </CardShell>
    );
  }

  const rader = team.data ?? [];

  return (
    <section className="flex flex-col gap-2">
      <div>
        <h2 className="text-label text-fg">Jobbfunksjon</h2>
        <p className="text-[12px] text-fg-muted leading-relaxed">
          Funksjonen bestemmer hvor personen lander etter innlogging og hva navet vektlegger.{' '}
          <strong className="text-fg">Den gir ingen rettigheter</strong> — tilgang styres av
          tilgangsnivået, som ikke endres her.
        </p>
      </div>

      {sett.error && (
        <CardShell className="flex items-start gap-3 p-3">
          <CircleAlert size={15} strokeWidth={1.75} className="mt-0.5 shrink-0 text-danger" />
          <p className="text-[12px] text-danger">{sett.error.message}</p>
        </CardShell>
      )}

      <div className="overflow-hidden rounded-xl border border-border">
        {/* Kolonneoverskrifter — «Tilgang» og «Funksjon» skal leses som to
            forskjellige ting, ikke som to navn på det samme. */}
        <div className="flex h-9 items-center gap-4 border-border border-b bg-surface-2 px-4 text-[12px] text-fg-muted">
          <span className="min-w-0 flex-1">Person</span>
          <span className="w-32 shrink-0">Tilgang</span>
          <span className="w-[280px] shrink-0">Funksjon</span>
        </div>

        {rader.map((r, i) => {
          const f = FUNKSJON[r.funksjon as Funksjon];
          const Ikon = f.icon;
          const laasesAv = sett.isPending && sett.variables?.userId === r.userId;

          return (
            <div
              key={r.userId}
              className={`flex min-h-row-store items-center gap-4 bg-bg px-4 py-2 ${
                i > 0 ? 'border-border border-t' : ''
              }`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {/*
                  F6-19 — seed er user.id (ansattflate). Status overstyrer
                  KUN humor når personen har mekanikerprofil; ellers det
                  lagrede uttrykket. Norsk label står under — uttrykket er
                  ikke eneste signal.
                */}
                <Avatar
                  seed={r.userId}
                  valg={{ ...r.avatar, humor: r.statusHumor ?? r.avatar.humor }}
                  navn={r.navn}
                  size={32}
                  bevegelse="stille"
                />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-label text-fg">
                    {r.navn}
                    {/* Kallenavnet er INTERNT, og dette er en intern flate.
                        Det vises som et tillegg, ikke i stedet for navnet —
                        lederen må kunne se hvem raden faktisk gjelder. */}
                    {r.kallenavn && (
                      <span className="ml-1.5 text-[12px] text-fg-muted">«{r.kallenavn}»</span>
                    )}
                  </span>
                  <span className="truncate text-[12px] text-fg-muted">
                    {r.epost || 'Ingen e-post'}
                    {!r.kanLoggeInn ? ' · uten innlogging' : ''}
                  </span>
                  {r.statusLabel && (
                    <span className="flex items-center gap-1.5 text-[12px] text-fg-muted">
                      <span
                        aria-hidden
                        className={`inline-block size-2 rounded-full ${
                          r.status === 'ledig'
                            ? 'bg-success'
                            : r.status === 'fri'
                              ? 'bg-fg-muted'
                              : 'bg-warn'
                        }`}
                      />
                      {r.statusLabel}
                    </span>
                  )}
                </div>
              </div>

              <span className="w-32 shrink-0 text-[12px] text-fg-muted">{r.rolle}</span>

              <div className="w-[280px] shrink-0">
                {r.kanEndres ? (
                  <fieldset
                    aria-label={`Funksjon for ${r.navn}`}
                    className="inline-flex h-control items-center gap-0.5 rounded-control border border-border bg-bg p-0.5"
                  >
                    {VALGBARE.map((v) => {
                      const valgt = r.funksjon === v;
                      const spek = FUNKSJON[v];
                      const VIkon = spek.icon;
                      return (
                        <button
                          key={v}
                          type="button"
                          // `aria-pressed` og ikke `role="radio"`: en ekte
                          // radiogruppe krever piltast-navigasjon og roving
                          // tabindex. Tre trykknapper der én er aktiv er
                          // ærligere enn en radiogruppe som ikke oppfører seg
                          // som en. Samme mønster som filtrene ellers i appen.
                          aria-pressed={valgt}
                          disabled={laasesAv}
                          title={spek.hint}
                          onClick={() => sett.mutate({ userId: r.userId, funksjon: v })}
                          className={`inline-flex h-7 items-center gap-1.5 rounded-[7px] px-2.5 text-label transition-colors disabled:opacity-50 ${
                            valgt ? 'bg-sidebar-active text-fg' : 'text-fg-muted hover:text-fg'
                          }`}
                        >
                          <VIkon size={13} strokeWidth={1.75} />
                          {spek.label}
                        </button>
                      );
                    })}
                  </fieldset>
                ) : (
                  /* ⛔ Ledere får ikke tildelt funksjon. Feltet mangler ikke —
                     det står hvorfor, ellers leses det som en feil. */
                  <span
                    className={`inline-flex h-badge items-center gap-1 rounded-badge px-1.5 font-medium text-[11px] ${f.tone}`}
                    title="Følger av tilgangsnivået — kan ikke tildeles"
                  >
                    <Ikon size={11} strokeWidth={2} />
                    {f.label}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="flex items-start gap-1.5 px-1 text-[11px] text-fg-muted leading-relaxed">
        <CircleUser size={13} strokeWidth={1.75} className="mt-0.5 shrink-0" />
        «Leder» følger av tilgangsnivået og kan ikke velges her. Selger og support har nøyaktig
        samme tilgang — forskjellen er hvor de starter dagen.
      </p>
    </section>
  );
}
