'use client';

import {
  Building2,
  CircleAlert,
  LifeBuoy,
  type LucideIcon,
  StatefulButton,
  Users,
  Wrench,
} from '@endwise/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { type FormEvent, useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../_shell/cards';
import { useInboxModus } from './_modus';

/**
 * F5-14 / F6-01 — «ny samtale» som e-post: mottakerliste, ikke en hub.
 * Én stor pille med nøyaktig tre piller inni (Jonas + Mikael ):
 * Kunde → customers.list · customer_dealer
 * Intern → mechanics.list · mechanic_dealer (verkstedsgulvet — mekanikerne bor her)
 * Support → dealer_admin / Endwise (het «Skriv til Endwise»)
 * Support er default og primær (fylt bg-fg). De to andre er outline.
 * Ingen bruker-ID-felt. Ingen fjerde Mekaniker-pille.
 */
type Pille = 'kunde' | 'intern' | 'support';

const PILLER: { key: Pille; label: string; icon: LucideIcon }[] = [
  { key: 'kunde', label: 'Kunde', icon: Users },
  { key: 'intern', label: 'Intern', icon: Wrench },
  { key: 'support', label: 'Support', icon: LifeBuoy },
];

type Mottaker = {
  id: string;
  navn: string;
  /** Better-Auth-ID når mottakeren kan nås i appen. Aldri vist. */
  userId?: string;
  undertekst?: string;
};

const ENDWISE_MOTTAKER: Mottaker = {
  id: 'endwise',
  navn: 'Endwise',
  undertekst: 'Support',
};

export function NySamtale({ onLukk }: { onLukk: () => void }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const endwise = useInboxModus() === 'endwise';
  const me = trpc.session.me.useQuery();

  const [pille, setPille] = useState<Pille>('support');
  const [sok, setSok] = useState('');
  const [valgt, setValgt] = useState<Mottaker | null>(endwise ? null : ENDWISE_MOTTAKER);
  const [emne, setEmne] = useState('');
  const [tekst, setTekst] = useState('');

  const kunder = trpc.customers.list.useQuery(
    { limit: 200, sorter: 'navn' },
    { enabled: !endwise && pille === 'kunde' },
  );
  const mekanikere = trpc.mechanics.list.useQuery(undefined, {
    enabled: !endwise && pille === 'intern',
  });
  const forhandlere = trpc.tenants.list.useQuery(undefined, {
    enabled: endwise && pille === 'support',
  });

  const post = trpc.messages.post.useMutation({
    onSuccess: (_, vars) => {
      void utils.messages.listThreads.invalidate();
      void utils.messages.listPlatformSupport.invalidate();
      const dest = endwise ? `/endwise/innboks/${vars.threadId}` : `/innboks/${vars.threadId}`;
      router.replace(dest as Route);
    },
  });

  const opprett = trpc.messages.createThread.useMutation({
    onSuccess: (tråd) => {
      const id = (tråd as { id?: string } | null)?.id;
      if (!id) return;
      post.mutate({ threadId: id, body: tekst.trim() });
    },
  });

  const opprettPlattform = trpc.messages.createPlatformSupportThread.useMutation({
    onSuccess: (tråd) => {
      void utils.messages.listPlatformSupport.invalidate();
      const id = (tråd as { id?: string } | null)?.id;
      if (id) router.replace(`/endwise/innboks/${id}` as Route);
      else onLukk();
    },
  });

  const liste: Mottaker[] = useMemo(() => {
    const q = sok.trim().toLowerCase();
    const treffer = (m: Mottaker) =>
      !q || m.navn.toLowerCase().includes(q) || (m.undertekst?.toLowerCase().includes(q) ?? false);

    if (endwise) {
      if (pille !== 'support') return [];
      return (forhandlere.data ?? [])
        .map((t) => ({
          id: t.id,
          navn: t.name,
          undertekst: t.kind === 'demo' ? 'Demo' : undefined,
        }))
        .filter(treffer);
    }

    if (pille === 'support') return [ENDWISE_MOTTAKER].filter(treffer);

    if (pille === 'kunde') {
      return (kunder.data ?? [])
        .map((k) => ({
          id: k.id,
          navn: k.name,
          userId: k.userId ?? undefined,
          undertekst: k.email || k.phone || undefined,
        }))
        .filter(treffer);
    }

    return (mekanikere.data ?? [])
      .filter((m) => m.active !== false)
      .filter((m) => !m.userId || m.userId !== me.data?.userId)
      .map((m) => ({
        id: m.id,
        navn: m.name,
        userId: m.userId ?? undefined,
      }))
      .sort((a, b) => a.navn.localeCompare(b.navn, 'nb'))
      .filter(treffer);
  }, [endwise, pille, sok, kunder.data, mekanikere.data, forhandlere.data, me.data?.userId]);

  const mottaker = !endwise && pille === 'support' ? ENDWISE_MOTTAKER : valgt;

  const laster =
    (pille === 'kunde' && !endwise && kunder.isLoading) ||
    (pille === 'intern' && !endwise && mekanikere.isLoading) ||
    (pille === 'support' && endwise && forhandlere.isLoading);

  const jobber = opprett.isPending || post.isPending || opprettPlattform.isPending;
  const feil = opprett.error ?? post.error ?? opprettPlattform.error;

  function velgPille(neste: Pille) {
    setPille(neste);
    setSok('');
    setValgt(!endwise && neste === 'support' ? ENDWISE_MOTTAKER : null);
  }

  function send(e: FormEvent) {
    e.preventDefault();
    const body = tekst.trim();
    if (!body || !mottaker) return;

    if (endwise) {
      opprettPlattform.mutate({
        tenantId: mottaker.id,
        subject: emne.trim() || undefined,
        body,
      });
      return;
    }

    if (pille === 'support') {
      opprett.mutate({
        kind: 'dealer_admin',
        channel: 'app',
        subject: emne.trim() || 'Hjelp',
        participantIds: [],
      });
      return;
    }

    if (pille === 'kunde') {
      opprett.mutate({
        kind: 'customer_dealer',
        channel: 'app',
        subject: emne.trim() || mottaker.navn,
        participantIds: mottaker.userId ? [mottaker.userId] : [],
      });
      return;
    }

    opprett.mutate({
      kind: 'mechanic_dealer',
      channel: 'app',
      subject: emne.trim() || undefined,
      participantIds: mottaker.userId ? [mottaker.userId] : [],
    });
  }

  return (
    <CardShell className="p-5">
      <form onSubmit={send} className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-label text-fg">Ny chat</p>
            <p className="text-[12px] text-fg-muted">
              Velg mottaker i lista — som en e-post, ikke en hub.
            </p>
          </div>
          <button
            type="button"
            onClick={onLukk}
            className="h-control shrink-0 rounded-control px-3 text-label text-fg-muted transition-colors hover:text-fg"
          >
            Avbryt
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-label text-fg-muted">Til</p>
          <p className="h-control rounded-control border border-border bg-surface-2 px-3 text-body text-fg leading-8">
            {mottaker ? mottaker.navn : 'Velg i lista under'}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Filtrer mottakere"
          className="flex rounded-pill border border-border bg-surface-2 p-1"
        >
          {PILLER.map((p) => {
            const aktiv = pille === p.key;
            const primær = p.key === 'support';
            return (
              <button
                key={p.key}
                type="button"
                role="tab"
                aria-selected={aktiv}
                onClick={() => velgPille(p.key)}
                className={`flex min-w-0 items-center justify-center gap-1.5 rounded-pill px-2.5 py-1.5 text-label transition-colors ${
                  primær ? 'flex-[1.2]' : 'flex-1'
                } ${pilleKlasse(aktiv, primær)}`}
              >
                <p.icon size={14} strokeWidth={1.75} className="shrink-0" />
                <span className="truncate">{p.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          <input
            type="search"
            value={sok}
            onChange={(e) => setSok(e.target.value)}
            placeholder="Søk i lista"
            aria-label="Søk i mottakerlista"
            className="h-control rounded-control border border-border bg-bg px-3 text-body text-fg outline-none placeholder:text-fg-muted focus-visible:outline-2 focus-visible:outline-ring"
          />

          <div className="max-h-56 overflow-y-auto rounded-control border border-border">
            {laster ? (
              <p className="px-3 py-6 text-center text-[12px] text-fg-muted">Laster …</p>
            ) : liste.length === 0 ? (
              <p className="px-3 py-6 text-center text-[12px] text-fg-muted leading-relaxed">
                {tommelding(pille, endwise)}
              </p>
            ) : (
              <ul className="flex flex-col p-1">
                {liste.map((m) => {
                  const aktiv = mottaker?.id === m.id;
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => setValgt(m)}
                        aria-pressed={aktiv}
                        className={`flex w-full items-center gap-2 rounded-control px-3 py-2 text-left transition-colors ${
                          aktiv ? 'bg-sidebar-active text-fg' : 'text-fg hover:bg-surface-2'
                        }`}
                      >
                        {pille === 'support' && endwise ? (
                          <Building2
                            size={16}
                            strokeWidth={1.75}
                            className="shrink-0 text-fg-muted"
                          />
                        ) : null}
                        <span className="min-w-0 flex-1 truncate text-label">{m.navn}</span>
                        {m.undertekst && (
                          <span className="max-w-[40%] shrink-0 truncate text-[11px] text-fg-muted">
                            {m.undertekst}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-label text-fg-muted">Emne</span>
          <input
            value={emne}
            onChange={(e) => setEmne(e.target.value)}
            maxLength={140}
            placeholder="Valgfritt"
            className="h-control rounded-control border border-border bg-bg px-3 text-body text-fg outline-none placeholder:text-fg-muted focus-visible:outline-2 focus-visible:outline-ring"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-label text-fg-muted">Melding</span>
          <textarea
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            rows={4}
            maxLength={4000}
            required
            placeholder="Skriv meldingen …"
            className="min-h-[96px] resize-y rounded-control border border-border bg-bg px-3 py-2 text-body text-fg outline-none placeholder:text-fg-muted focus-visible:outline-2 focus-visible:outline-ring"
          />
        </label>

        {feil && (
          <p className="flex items-start gap-2 text-body text-danger">
            <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            {feil.message}
          </p>
        )}

        <div className="flex justify-end">
          <StatefulButton
            type="submit"
            disabled={jobber || !mottaker || !tekst.trim()}
            state={jobber ? 'loading' : feil ? 'error' : 'idle'}
            loadingText="Sender…"
            errorText="Feilet"
          >
            Send
          </StatefulButton>
        </div>
      </form>
    </CardShell>
  );
}

/** Support = fylt bg-fg. Kunde/Intern = outline, også når de er valgt. */
function pilleKlasse(aktiv: boolean, primær: boolean): string {
  if (primær && aktiv) return 'bg-fg text-bg';
  if (primær) return 'text-fg-muted hover:text-fg';
  if (aktiv) return 'border border-fg bg-bg text-fg';
  return 'border border-transparent text-fg-muted hover:text-fg';
}

function tommelding(pille: Pille, endwise: boolean): string {
  if (endwise && pille !== 'support') {
    return 'Denne innboksen er forhandler-support. Kunder og intern-team ligger hos verkstedet.';
  }
  if (pille === 'kunde') return 'Ingen kunder å skrive til ennå.';
  if (pille === 'intern') return 'Ingen på verkstedsgulvet å skrive til ennå.';
  return 'Ingen forhandlere å skrive til ennå.';
}
