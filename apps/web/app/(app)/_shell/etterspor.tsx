'use client';

import { CircleAlert, MessageSquarePlus, StatefulButton } from '@endwise/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { CardShell } from './cards';

/**
 * F5-19 / F5-11 — «meld interesse».
 * Hvorfor dette ikke er en av/på-knapp
 * Forhandleren kan ikke aktivere en tjeneste selv. Entitlements skrives kun av
 * den signaturverifiserte Stripe-webhooken (F5-09), eller av oss etter avtale.
 * En knapp som lot som noe ble skrudd på ville vært en løgn med to utfall:
 * enten skjer ingenting, eller så tar vi betalt for noe ingen ba om.
 * Hvorfor det heller ikke er en `mailto:`
 * Fordi vi allerede har kanalen. Support-tråden forhandlerEndwise (F5-11) er
 * bygget, den ligger i innboksen, og den er sporbar for begge parter. En
 * e-post fra en tilfeldig adresse er verken.
 * Ønsket blir altså en ekte tråd med emne «Ønsker: <navn>», og forhandleren
 * sendes rett inn i den — der kan hun skrive mer, og vi kan svare.
 */
export function Etterspor({
  hva,
  kontekst,
  knappetekst = 'Meld interesse',
}: {
  /** Navnet på tjenesten/integrasjonen. Blir en del av emnet. */
  hva: string;
  /** Én setning om hva det gjelder — havner i første melding. */
  kontekst: string;
  knappetekst?: string;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [apen, setApen] = useState(false);
  const [tekst, setTekst] = useState('');

  const post = trpc.messages.post.useMutation({
    onSuccess: (_, vars) => {
      void utils.messages.listThreads.invalidate();
      router.push(`/innboks/${vars.threadId}` as Route);
    },
  });

  const opprett = trpc.messages.createThread.useMutation({
    onSuccess: (traad) => {
      const id = (traad as { id?: string } | null)?.id;
      if (!id) return;
      post.mutate({
        threadId: id,
        body: `${kontekst}\n\n${tekst.trim() || 'Vi vil gjerne høre mer om hva dette koster og hva som kreves.'}`,
      });
    },
  });

  const jobber = opprett.isPending || post.isPending;
  const feil = opprett.error ?? post.error;

  function submit(e: FormEvent) {
    e.preventDefault();
    opprett.mutate({
      // Support-kanalen: forhandler Endwise. Ikke en kundetråd.
      kind: 'dealer_admin',
      subject: `Ønsker: ${hva}`,
      participantIds: [],
    });
  }

  if (!apen) {
    return (
      <button
        type="button"
        onClick={() => setApen(true)}
        className="inline-flex h-control shrink-0 items-center gap-1.5 rounded-control border border-border px-2.5 text-label text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
      >
        <MessageSquarePlus size={14} strokeWidth={1.75} />
        {knappetekst}
      </button>
    );
  }

  return (
    <CardShell className="w-full p-4">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div>
          <p className="text-label text-fg">Meld interesse for «{hva}»</p>
          <p className="text-[12px] text-fg-muted leading-relaxed">
            Dette oppretter en samtale med Endwise i innboksen din. Ingenting bestilles eller
            aktiveres — vi tar kontakt.
          </p>
        </div>

        <textarea
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Valgfritt: hva trenger dere det til?"
          aria-label={`Melding om ${hva}`}
          className="resize-y rounded-control border border-border bg-bg px-3 py-2 text-body text-fg outline-none placeholder:text-fg-muted/60 focus-visible:border-fg"
        />

        {feil && (
          <p className="flex items-start gap-2 text-body text-danger">
            <CircleAlert size={15} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            {feil.message}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setApen(false)}
            className="h-control rounded-control px-3 text-label text-fg-muted transition-colors hover:text-fg"
          >
            Avbryt
          </button>
          <StatefulButton
            type="submit"
            disabled={jobber}
            state={jobber ? 'loading' : feil ? 'error' : 'idle'}
            loadingText="Sender…"
            errorText="Feilet"
          >
            Send til Endwise
          </StatefulButton>
        </div>
      </form>
    </CardShell>
  );
}
