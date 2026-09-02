'use client';

import {
  Avatar,
  type AvatarValg,
  Button,
  MessageSquare,
  Trash2,
} from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { CountBadge } from '../_shell/cards';
import { useInboxFilter } from '../_shell/inbox-filter';
import { type Kanal, KanalMerke, tilKanal } from './_kanal';
import { NyMeldingIkon } from './_ny-melding-ikon';
import {
  fmtWhen,
  KIND_LABEL,
  KIND_TONE,
  supportRadTittel,
  type ThreadKind,
  threadHeading,
  visningForTraadtype,
} from './_lib';
import { useInboxModus } from './_modus';

/**
 * F6-01 / F5-14 — innboksens egen sidebar.
 * Den andre sidebaren. Hoved-sidebaren sier hvilket rom du er i; denne sier
 * hvilken samtale. Samme oppbygning som hoved-sidebaren med vilje: en 56px
 * header med `border-b` som ligger på samme linje som topbarens skillelinje, og
 * innholdet under. To kolonner som er bygget likt leses som ett system.
 * Part-filtrene bor i DestinasjonSeksjonBar under Ronny. To kontroller
 * for samme filter ville før eller siden gått ut av synk.
 * Navnebytte. Disse filtrene het «kanaler» i koden, men de
 * filtrerer på `thread_kind` — altså hvem samtalen er med. Nå som `channel`
 * finnes som ekte kolonne (SMS/e-post/app/widget) ville to ting med samme navn
 * vært en garantert forveksling. Filtrene heter `PARTER`; kanal er kanal.
 */
export function InboxSidebar() {
  const params = useParams<{ id?: string }>();
  const aktivId = params?.id;
  const modus = useInboxModus();
  const endwise = modus === 'endwise';
  const { part, sortering, setSortering, skjulte, skjul, skjulFlere } = useInboxFilter();
  const [velgModus, setVelgModus] = useState(false);
  const [valgte, setValgte] = useState<ReadonlySet<string>>(() => new Set());

  const me = trpc.session.me.useQuery();
  const threads = trpc.messages.listThreads.useQuery(undefined, { enabled: !endwise });
  const support = trpc.messages.listPlatformSupport.useQuery(undefined, {
    enabled: endwise,
    retry: false,
  });
  const ekte = threads.data ?? [];

  /**
   * Navnene på alle motparter i innboksen.
   * To oppslag, og det er ikke sløsing
   * Kallenavn er lov i interne tråder (`mechanic_dealer`, `dealer_admin`) og
   * forbudt i kundetråder. Ett samlet oppslag ville måttet velge én visning for
   * hele lista — og da hadde enten kallenavnene forsvunnet der de hører hjemme,
   * eller dukket opp i en kundesamtale. Derfor deles IDene etter trådtype, og
   * hvert sett spørres med sin egen visning.
   * Serveren løser navnet; klienten velger bare hvilket kart den slår opp i.
   * Se `visningForTraadtype` i `@endwise/modules/profil`.
   * `agent:`-IDene filtreres bort før vi spør — de er ikke mennesker og finnes
   * ikke i noe register.
   */
  const [internIder, offisielleIder] = useMemo(() => {
    const intern = new Set<string>();
    const offisiell = new Set<string>();
    for (const t of ekte) {
      const maal = visningForTraadtype(t.kind) === 'intern' ? intern : offisiell;
      for (const id of t.motparter ?? []) {
        if (!id.startsWith('agent:')) maal.add(id);
      }
    }
    return [[...intern], [...offisiell]];
  }, [ekte]);

  const navnIntern = trpc.directory.participants.useQuery(
    { ids: internIder, visning: 'intern' },
    { enabled: internIder.length > 0, staleTime: 5 * 60_000 },
  );
  const navnOffisiell = trpc.directory.participants.useQuery(
    { ids: offisielleIder, visning: 'offisiell' },
    { enabled: offisielleIder.length > 0, staleTime: 5 * 60_000 },
  );

  const rader = useMemo(() => {
    const filtrert = ekte
      .filter((t) => !skjulte.has(t.id))
      .filter((t) => part === 'alle' || t.kind === part)
      .slice()
      .sort((a, b) => {
        const da = new Date(a.lastMessageAt).getTime();
        const db = new Date(b.lastMessageAt).getTime();
        return sortering === 'eldste' ? da - db : db - da;
      });
    return filtrert.map((t) => ({
      id: t.id,
      kind: t.kind as ThreadKind,
      avsender: threadHeading(
        t.subject,
        t.kind,
        t.motparter ?? [],
        // Kartet velges per tråd, ikke per liste. Dette er hele grunnen til
        // at det er to oppslag.
        visningForTraadtype(t.kind) === 'intern' ? navnIntern.data : navnOffisiell.data,
        me.data?.userId,
      ),
      utdrag: '',
      nar: fmtWhen(t.lastMessageAt),
      ulest: t.unread ?? 0,
      // Ekte kanaldata fra `threads.channel` / siste meldings `channel`.
      kanal: tilKanal(t.channel),
      sisteKanal: tilKanal(t.sisteKanal),
      /**
       * Ansiktet på raden.
       * En tråd kan ha flere motparter, men raden har plass til ÉN. Vi tar
       * den første som verken er deg selv eller en agent — samme person
       * `threadHeading` navngir raden etter, så bilde og navn ikke peker på
       * hver sin deltaker.
       * Seeden kommer fra serveren (`participants.seed`), ikke fra
       * deltaker-IDen: for en kunde er den `customers.id`, som er den samme
       * seeden kundekortet bruker. Ellers ville samme menneske hatt to
       * ansikter på to flater.
       */
      motpart: motpartFor(
        t.motparter ?? [],
        visningForTraadtype(t.kind) === 'intern' ? navnIntern.data : navnOffisiell.data,
        me.data?.userId,
      ),
    }));
  }, [ekte, part, sortering, skjulte, navnIntern.data, navnOffisiell.data, me.data?.userId]);

  if (endwise) {
    const henvendelser = support.data ?? [];
    return (
      <aside
        className={`flex min-h-0 w-full shrink-0 flex-col border-border bg-sidebar md:w-[320px] md:border-r ${
          aktivId ? 'max-md:hidden' : ''
        }`}
      >
        <div className="flex h-14 shrink-0 items-center px-3">
          <h2 className="min-w-0 truncate text-title text-fg">Innboks</h2>
        </div>
        <div className="shrink-0 border-border border-b p-2">
          <NySamtaleLenke href={'/endwise/innboks?ny=1' as Route} full />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-2">
          {support.isLoading ? (
            <p className="px-2 py-8 text-center text-[12px] text-fg-muted">Laster henvendelser …</p>
          ) : henvendelser.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-2 py-10 text-center">
              <MessageSquare size={20} className="text-fg-muted" />
              <p className="text-label text-fg">Ingen henvendelser ennå</p>
              <p className="text-[12px] text-fg-muted leading-relaxed">
                Når et verksted skriver til Endwise, lander det her.
              </p>
            </div>
          ) : (
            henvendelser.map((t) => (
              <Link key={t.id} href={`/endwise/innboks/${t.id}` as Route} className="block">
                <SupportKort
                  navn={supportRadTittel(t.kontaktNavn, t.tenantName)}
                  utdrag={t.sisteTekst?.trim() || t.subject?.trim() || ''}
                  ulest={Boolean(t.unread)}
                  aktiv={t.id === aktivId}
                  nar={fmtWhen(t.lastMessageAt)}
                />
              </Link>
            ))
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`flex min-h-0 w-full shrink-0 flex-col border-border bg-sidebar md:w-[320px] md:border-r ${
        aktivId ? 'max-md:hidden' : ''
      }`}
    >
      {/**
       * Mikael 02.09: én verktøylinje — Nyeste, Eldste, slett, ny chat, velg kort.
       * Telefon kan wrappe, men alt sitter i samme stripe (z-20, min 44px).
       */}
      <div className="relative z-20 flex shrink-0 flex-col overflow-visible px-3 py-1.5">
        <h2 className="sr-only">Samtaler</h2>
        <div
          data-innboks-verktoy
          className="relative z-20 flex flex-wrap items-center gap-1.5 overflow-visible"
          role="toolbar"
          aria-label="Innboks"
        >
          {(
            [
              ['nyeste', 'Nyeste'],
              ['eldste', 'Eldste'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSortering(key)}
              aria-pressed={sortering === key}
              className={`inline-flex min-h-11 items-center rounded-control px-2.5 text-label transition-colors md:h-control md:min-h-control ${
                sortering === key ? 'bg-sidebar-active text-fg' : 'text-fg hover:bg-surface-2'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            aria-label="Slett valgt samtale"
            title="Slett valgt samtale"
            disabled={velgModus ? valgte.size === 0 : !aktivId}
            className="relative z-20 inline-flex min-h-11 min-w-11 items-center justify-center rounded-control text-danger hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => {
              if (velgModus) {
                skjulFlere([...valgte]);
                setValgte(new Set());
                return;
              }
              if (aktivId) skjul(aktivId);
            }}
          >
            <Trash2 size={16} strokeWidth={1.75} />
          </button>
          <Link
            href={'/innboks?ny=1' as Route}
            aria-label="Ny melding"
            title="Ny melding"
            className="relative z-20 inline-flex min-h-11 min-w-11 items-center justify-center rounded-control text-fg hover:bg-surface-2"
          >
            <NyMeldingIkon size={16} />
          </Link>
          <button
            type="button"
            aria-pressed={velgModus}
            onClick={() => {
              setVelgModus((v) => !v);
              setValgte(new Set());
            }}
            className={`inline-flex min-h-11 items-center rounded-control px-2.5 text-label ${
              velgModus ? 'bg-sidebar-active text-fg' : 'text-fg hover:bg-surface-2'
            }`}
          >
            Velg kort
          </button>
        </div>
      </div>

      {/* Samtalene */}
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-2">
        {threads.isLoading ? (
          <p className="px-2 py-8 text-center text-[12px] text-fg-muted">Laster samtaler …</p>
        ) : rader.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-2 py-10 text-center">
            <MessageSquare size={20} className="text-fg-muted" />
            <p className="text-label text-fg">Ingen samtaler</p>
            <p className="text-[12px] text-fg-muted">
              {part === 'alle'
                ? 'Innboksen er tom. Skriv til Endwise hvis du lurer på noe.'
                : 'Ingen samtaler for denne parten.'}
            </p>
            {part === 'alle' && (
              <Link
                href={'/innboks?ny=1' as Route}
                className="mt-1 inline-flex h-control items-center rounded-control bg-fg px-3 text-[12px] text-bg"
              >
                Skriv til Endwise
              </Link>
            )}
          </div>
        ) : (
          rader.map((t) =>
            velgModus ? (
              <button
                key={t.id}
                type="button"
                aria-pressed={valgte.has(t.id)}
                onClick={() => {
                  setValgte((forrige) => {
                    const neste = new Set(forrige);
                    if (neste.has(t.id)) neste.delete(t.id);
                    else neste.add(t.id);
                    return neste;
                  });
                }}
                className="flex w-full items-start gap-2 text-left"
              >
                <span
                  aria-hidden
                  className={`mt-3 size-4 shrink-0 rounded-sm border ${
                    valgte.has(t.id) ? 'border-fg bg-fg' : 'border-border bg-bg'
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <SamtaleKort rad={t} aktiv={valgte.has(t.id)} />
                </span>
              </button>
            ) : (
              <Link key={t.id} href={`/innboks/${t.id}` as Route} className="block">
                <SamtaleKort rad={t} aktiv={t.id === aktivId} />
              </Link>
            ),
          )
        )}
      </div>
    </aside>
  );
}

/**
 * Hvem raden skal vise ansiktet til.
 * Null når tråden bare har deg selv og agenter i seg — da tegnes ingen avatar
 * i stedet for en tilfeldig plassholder. Et ansikt som ikke står for noen, er
 * verre enn ingen ansikt.
 */
/** Rad i Endwise-innboksen: forhandlernavn først, sist melding muted. */
function SupportKort({
  navn,
  utdrag,
  ulest,
  aktiv,
  nar,
}: {
  navn: string;
  utdrag: string;
  ulest: boolean;
  aktiv: boolean;
  nar: string;
}) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-control border px-3 py-2.5 transition-colors ${
        aktiv ? 'border-border-strong bg-sidebar-active' : 'border-border bg-bg hover:bg-surface-2'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-label text-fg">{navn}</span>
        {ulest && (
          <span
            className="size-2 shrink-0 rounded-full bg-accent-strong"
            title="Ulest"
            aria-hidden
          />
        )}
        {ulest && <span className="sr-only">Ulest</span>}
        <span className="shrink-0 text-[11px] text-fg-muted tabular-nums">{nar}</span>
      </div>
      {utdrag && <p className="truncate text-[12px] text-fg-muted">{utdrag}</p>}
    </div>
  );
}

function motpartFor(
  motparter: string[],
  navn: Record<string, { navn: string; seed: string; avatar: AvatarValg }> | undefined,
  megId: string | undefined,
): { seed: string; navn: string; avatar: AvatarValg | null } | null {
  for (const id of motparter) {
    if (!id || id === megId || id.startsWith('agent:')) continue;
    const treff = navn?.[id];
    // Ukjent ID: vi har ingen seed vi kan stole på (deltaker-IDen er ikke
    // seeden), så da tegnes ingenting. Se `directory.participants`.
    if (treff) return { seed: treff.seed, navn: treff.navn, avatar: treff.avatar };
  }
  return null;
}

/** Én samtale i lista: kanal, referanse, tidspunkt, avsender, utdrag og part. */
function SamtaleKort({
  rad,
  aktiv,
}: {
  rad: {
    kind: ThreadKind;
    avsender: string;
    utdrag: string;
    nar: string;
    ulest: number;
    kanal: Kanal;
    sisteKanal: Kanal;
    motpart: { seed: string; navn: string; avatar: AvatarValg | null } | null;
  };
  aktiv: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-control border px-3 py-2.5 transition-colors ${
        aktiv ? 'border-border-strong bg-sidebar-active' : 'border-border bg-bg hover:bg-surface-2'
      }`}
    >
      <div className="flex items-center gap-2">
        {/*
         * Kanalen står først på raden, ikke bak en bryter. Det er den som
         * avgjør hvordan man svarer — se `_kanal.tsx`.
         */}
        <KanalMerke kanal={rad.sisteKanal} kunIkon />
        <span className="ml-auto shrink-0 text-[11px] text-fg-muted tabular-nums">{rad.nar}</span>
      </div>

      <div className="flex items-center gap-2">
        {/*
         * Ansiktet står før navnet: øyet kjenner igjen en form
         * raskere enn det leser en streng, og lista skannes mer enn den
         * leses. `navn` tom = dekorativ, siden navnet står rett ved siden av
         * og en skjermleser ellers ville lest det to ganger.
         */}
        {rad.motpart && (
          <Avatar
            seed={rad.motpart.seed}
            valg={rad.motpart.avatar}
            size={20}
            navn=""
            /*
             * Lista. Ett `<img>` per rad, ingen bevegelse. Dette er flaten
             * hele `bevegelse`-propen finnes for å beskytte.
             */
            bevegelse="stille"
          />
        )}
        <span className={`truncate text-label ${rad.ulest > 0 ? 'text-fg' : 'text-fg-muted'}`}>
          {rad.avsender}
        </span>
        <CountBadge count={rad.ulest} label="uleste" className="ml-auto" />
      </div>

      {rad.utdrag && (
        <p className="line-clamp-2 text-[12px] text-fg-muted leading-snug">{rad.utdrag}</p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-flex h-badge items-center rounded-badge px-1.5 font-medium text-[11px] ${
            KIND_TONE[rad.kind] ?? 'bg-surface-2 text-fg-muted'
          }`}
        >
          {KIND_LABEL[rad.kind] ?? rad.kind}
        </span>
        {/*
         * Bytter samtalen vei, skal det ses i lista — ikke først når du
         * åpner tråden og svarer feil sted.
         */}
        {rad.sisteKanal !== rad.kanal && (
          <span className="inline-flex h-badge items-center gap-1 rounded-badge bg-surface-2 px-1.5 text-[11px] text-fg-muted">
            svar som
            <KanalMerke kanal={rad.kanal} kunIkon />
          </span>
        )}
      </div>
    </div>
  );
}

/** Tydelig compose-knapp med tekst. Ikon alene var for lett å overse. */
function NySamtaleLenke({ href, full }: { href: Route; full?: boolean }) {
  return (
    <Button asChild className={full ? 'w-full' : 'shrink-0'}>
      <Link href={href}>
        <NyMeldingIkon size={16} />
        Ny chat
      </Link>
    </Button>
  );
}
