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
import { InnstillingRad, InnstillingSeksjon } from '../_shell/innstilling-gruppe';
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
    <form data-ny-melding-skjema onSubmit={send} className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-title text-fg">Ny melding</p>
          <p className="mt-1 text-[13px] text-fg-muted">Velg mottaker, skriv, send.</p>
        </div>
        <button
          type="button"
          onClick={onLukk}
          className="h-control shrink-0 rounded-control px-3 text-label text-fg-muted transition-colors hover:text-fg"
        >
          Avbryt
        </button>
      </div>

      <InnstillingSeksjon tittel="Mottaker" ingress="Gruppe og person i samme feltgruppe.">
        <InnstillingRad label="Gruppe">
          <NySamtaleKnapperad
            valg={PILLER.map((p) => ({ key: p.key, label: p.label }))}
            aktiv={pille}
            onVelg={(k) => velgPille(k as Pille)}
          />
        </InnstillingRad>
        <InnstillingRad label="Valgt" hint={mottaker ? mottaker.navn : 'Velg i lista under'}>
          <input
            type="search"
            value={sok}
            onChange={(e) => setSok(e.target.value)}
            placeholder="Søk i lista"
            aria-label="Søk i mottakerlista"
            className="h-control ew-felt ew-felt-md px-3"
          />
          <div className="mt-2 max-h-56 overflow-y-auto">
            {laster ? (
              <p className="py-6 text-center text-[12px] text-fg-muted">Laster …</p>
            ) : liste.length === 0 ? (
              <p className="py-6 text-center text-[12px] text-fg-muted leading-relaxed">
                {tommelding(pille, endwise)}
              </p>
            ) : (
              <ul className="flex flex-col">
                {liste.map((m) => {
                  const aktiv = mottaker?.id === m.id;
                  return (
                    <li key={m.id} className="border-border border-b last:border-0">
                      <button
                        type="button"
                        onClick={() => setValgt(m)}
                        aria-pressed={aktiv}
                        className={`flex w-full items-center gap-2 py-3 text-left transition-colors ${
                          aktiv ? 'text-fg' : 'text-fg-muted hover:text-fg'
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
                          <span className="max-w-[40%] shrink-0 truncate text-[13px] text-fg-muted">
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
        </InnstillingRad>
      </InnstillingSeksjon>

      <InnstillingSeksjon tittel="Melding">
        <InnstillingRad label="Emne" hint="Valgfritt">
          <input
            value={emne}
            onChange={(e) => setEmne(e.target.value)}
            maxLength={140}
            placeholder="Valgfritt"
            className="h-control ew-felt ew-felt-md px-3"
          />
        </InnstillingRad>
        <InnstillingRad label="Tekst" siste>
          <textarea
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            rows={4}
            maxLength={4000}
            required
            placeholder="Skriv meldingen …"
            className="min-h-[96px] resize-y ew-felt ew-felt-md px-3 py-2"
          />
        </InnstillingRad>
      </InnstillingSeksjon>

      {feil && (
        <p className="flex items-start gap-2 text-body text-danger">
          <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          {feil.message}
        </p>
      )}

      <div className="flex justify-end" data-ny-melding-send>
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
  );
}

/** Samme knapperad som Kunder (kilde/sorter) — ikke piller i en hub. */
function NySamtaleKnapperad({
  valg,
  aktiv,
  onVelg,
}: {
  valg: readonly { key: string; label: string }[];
  aktiv: string;
  onVelg: (key: string) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Mottakergruppe"
      data-ny-samtale-knapperad
      className="inline-flex h-control items-center gap-0.5 rounded-control border border-border bg-bg p-0.5"
    >
      {valg.map((v) => (
        <button
          key={v.key}
          type="button"
          role="tab"
          aria-selected={aktiv === v.key}
          onClick={() => onVelg(v.key)}
          className={`inline-flex h-7 items-center rounded-[7px] px-2.5 text-label transition-colors ${
            aktiv === v.key ? 'bg-sidebar-active text-fg' : 'text-fg-muted hover:text-fg'
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}

function tommelding(pille: Pille, endwise: boolean): string {
  if (endwise && pille !== 'support') {
    return 'Denne innboksen er forhandler-support. Kunder og intern-team ligger hos verkstedet.';
  }
  if (pille === 'kunde') return 'Ingen kunder å skrive til ennå.';
  if (pille === 'intern') return 'Ingen på verkstedsgulvet å skrive til ennå.';
  return 'Ingen forhandlere å skrive til ennå.';
}
