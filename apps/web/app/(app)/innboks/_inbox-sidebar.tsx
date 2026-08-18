'use client';

import { Funnel, LifeBuoy, type LucideIcon, MessageSquare, Users, Wrench } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { type Kanal, KanalMerke, tilKanal } from './_kanal';
import {
  fmtWhen,
  KIND_LABEL,
  KIND_TONE,
  type ThreadKind,
  threadHeading,
  visningForTraadtype,
} from './_lib';
import { MOCK_TRADER } from './_mock';

/**
 * F6-01 / F5-14 — INNBOKSENS EGEN SIDEBAR.
 *
 * Den andre sidebaren. Hoved-sidebaren sier hvilket ROM du er i; denne sier
 * hvilken SAMTALE. Samme oppbygning som hoved-sidebaren med vilje: en 56px
 * header med `border-b` som ligger på samme linje som topbarens skillelinje, og
 * innholdet under. To kolonner som er bygget likt leses som ett system.
 *
 * Part-filtrene bor HER, ikke i hoved-sidebaren. To kontroller for samme filter
 * ville før eller siden gått ut av synk.
 *
 * ⚠️ **Navnebytte 08.08.2026.** Disse filtrene het «KANALER» i koden, men de
 * filtrerer på `thread_kind` — altså HVEM samtalen er med. Nå som `channel`
 * finnes som ekte kolonne (SMS/e-post/app/widget) ville to ting med samme navn
 * vært en garantert forveksling. Filtrene heter `PARTER`; kanal er kanal.
 */
const PARTER: { key: 'alle' | ThreadKind; label: string; icon?: LucideIcon }[] = [
  { key: 'alle', label: 'Alle' },
  { key: 'customer_dealer', label: 'Kunder', icon: Users },
  { key: 'mechanic_dealer', label: 'Intern', icon: Wrench },
  { key: 'dealer_admin', label: 'Endwise', icon: LifeBuoy },
];

export function InboxSidebar() {
  const params = useParams<{ id?: string }>();
  const aktivId = params?.id;
  const [part, setPart] = useState<'alle' | ThreadKind>('alle');

  const me = trpc.session.me.useQuery();
  const threads = trpc.messages.listThreads.useQuery();
  const ekte = threads.data ?? [];
  const brukerMock = !threads.isLoading && ekte.length === 0;

  /**
   * Navnene på alle motparter i innboksen.
   *
   * ── ⛔ TO oppslag, og det er ikke sløsing ────────────────────────────────
   * Kallenavn er lov i INTERNE tråder (`mechanic_dealer`, `dealer_admin`) og
   * forbudt i kundetråder. Ett samlet oppslag ville måttet velge én visning for
   * hele lista — og da hadde enten kallenavnene forsvunnet der de hører hjemme,
   * eller dukket opp i en kundesamtale. Derfor deles IDene etter trådtype, og
   * hvert sett spørres med sin egen visning.
   *
   * Serveren løser navnet; klienten velger bare hvilket kart den slår opp i.
   * Se `visningForTraadtype()` i `@endwise/modules/profil`.
   *
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
    if (brukerMock) {
      return MOCK_TRADER.filter((t) => part === 'alle' || t.kind === part).map((t) => ({
        id: t.id,
        ref: t.ref,
        kind: t.kind,
        avsender: t.avsender,
        utdrag: t.utdrag,
        nar: t.nar,
        ulest: t.ulest,
        kanal: t.kanal,
        sisteKanal: t.sisteKanal,
        mock: true,
      }));
    }
    return ekte
      .filter((t) => part === 'alle' || t.kind === part)
      .map((t) => ({
        id: t.id,
        // Kort referanse av tråd-id-en — det forhandleren leser opp i telefonen.
        ref: `SAK-${t.id.slice(0, 4).toUpperCase()}`,
        kind: t.kind as ThreadKind,
        avsender: threadHeading(
          t.subject,
          t.kind,
          t.motparter ?? [],
          // Kartet velges per TRÅD, ikke per liste. Dette er hele grunnen til
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
        mock: false,
      }));
  }, [brukerMock, ekte, part, navnIntern.data, navnOffisiell.data, me.data?.userId]);

  const aktivLabel = PARTER.find((p) => p.key === part)?.label ?? 'Alle';

  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-border border-r bg-sidebar">
      {/* ── Header: 56px + border-b, på linje med topbaren ─────────────── */}
      <div className="flex h-14 shrink-0 items-center gap-1 border-border border-b px-3">
        <h2 className="mr-auto min-w-0 truncate text-title text-fg">{aktivLabel}</h2>

        <div className="flex shrink-0 items-center gap-0.5">
          {PARTER.filter((p) => p.icon).map((p) => {
            const aktiv = part === p.key;
            return (
              <button
                key={p.key}
                type="button"
                // Klikk på aktiv part nullstiller til «Alle» — samme knapp,
                // begge veier, i stedet for en egen «Alle»-knapp ved siden av
                // en tittel som allerede sier «Alle».
                onClick={() => setPart(aktiv ? 'alle' : (p.key as ThreadKind))}
                aria-pressed={aktiv}
                title={p.label}
                aria-label={`Vis ${p.label}`}
                className={`flex size-7 items-center justify-center rounded-control transition-colors ${
                  aktiv
                    ? 'bg-sidebar-active text-fg'
                    : 'text-fg-muted hover:bg-sidebar-active/60 hover:text-fg'
                }`}
              >
                {p.icon && <p.icon size={16} strokeWidth={1.75} />}
              </button>
            );
          })}
          <span className="mx-1 h-4 w-px bg-border" />
          <button
            type="button"
            title="Flere filtre"
            aria-label="Flere filtre"
            className="flex size-7 items-center justify-center rounded-control text-fg-muted transition-colors hover:bg-sidebar-active/60 hover:text-fg"
          >
            <Funnel size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* ── Samtalene ──────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-2">
        {threads.isLoading ? (
          <p className="px-2 py-8 text-center text-[12px] text-fg-muted">Laster samtaler …</p>
        ) : rader.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-2 py-10 text-center">
            <MessageSquare size={20} className="text-fg-muted" />
            <p className="text-[12px] text-fg-muted">Ingen samtaler for denne parten.</p>
          </div>
        ) : (
          // Mock-radene lenker ingen steder — det finnes ingen tråd å åpne.
          rader.map((t) =>
            t.mock ? (
              <div key={t.id} aria-disabled className="cursor-default opacity-90">
                <SamtaleKort rad={t} aktiv={false} />
              </div>
            ) : (
              <Link key={t.id} href={`/innboks/${t.id}` as Route} className="block">
                <SamtaleKort rad={t} aktiv={t.id === aktivId} />
              </Link>
            ),
          )
        )}

        {brukerMock && (
          <p className="px-2 pt-2 pb-1 text-[11px] text-fg-muted leading-relaxed">
            Innboksen er tom, så eksempelsamtaler vises for å illustrere formen. De er ikke
            klikkbare.
          </p>
        )}
      </div>
    </aside>
  );
}

/** Én samtale i lista: kanal, referanse, tidspunkt, avsender, utdrag og part. */
function SamtaleKort({
  rad,
  aktiv,
}: {
  rad: {
    ref: string;
    kind: ThreadKind;
    avsender: string;
    utdrag: string;
    nar: string;
    ulest: number;
    kanal: Kanal;
    sisteKanal: Kanal;
    mock: boolean;
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
        {/* Kanalen står FØRST på raden, ikke bak en bryter. Det er den som
            avgjør hvordan man svarer — se `_kanal.tsx`. */}
        <KanalMerke kanal={rad.sisteKanal} kunIkon />
        <span className="font-mono text-[11px] text-fg-muted">{rad.ref}</span>
        <span className="ml-auto shrink-0 text-[11px] text-fg-muted tabular-nums">{rad.nar}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className={`truncate text-label ${rad.ulest > 0 ? 'text-fg' : 'text-fg-muted'}`}>
          {rad.avsender}
        </span>
        {rad.ulest > 0 && (
          <span className="ml-auto inline-flex h-badge shrink-0 items-center rounded-badge bg-accent-soft px-1.5 font-medium text-[11px] text-accent-strong tabular-nums">
            {rad.ulest}
            <span className="sr-only"> uleste</span>
          </span>
        )}
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
        {/* Bytter samtalen vei, skal det SES i lista — ikke først når du
            åpner tråden og svarer feil sted. */}
        {rad.sisteKanal !== rad.kanal && (
          <span className="inline-flex h-badge items-center gap-1 rounded-badge bg-surface-2 px-1.5 text-[11px] text-fg-muted">
            svar som
            <KanalMerke kanal={rad.kanal} kunIkon />
          </span>
        )}
        {rad.mock && (
          <span className="inline-flex h-badge items-center rounded-badge bg-warn-soft px-1.5 font-medium text-[11px] text-warn">
            Eksempel
          </span>
        )}
      </div>
    </div>
  );
}
