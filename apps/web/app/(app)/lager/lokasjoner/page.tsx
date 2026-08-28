'use client';

import { CircleAlert, MapPin, Plus, StatefulButton } from '@endwise/ui';
import { type FormEvent, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useOrgRole } from '../../_lib/use-org-role';
import { CardShell } from '../../_shell/cards';
import { LagerPiller } from '../../_shell/ansatte-piller';
import { Feil, Laster, Sidehode, Tomt } from '../_delt';

/**
 * Lager · Lokasjoner. Hylle, rom, servicebil.
 * Oppretting er `adminProcedure` server-side. Skjemaet vises derfor kun for
 * admin — men det er kosmetikk; sperren står i `inventory.createLocation`.
 */
export default function LokasjonerPage() {
  const { isAdmin } = useOrgRole();
  const utils = trpc.useUtils();
  const lokasjoner = trpc.inventory.listLocations.useQuery();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  const opprett = trpc.inventory.createLocation.useMutation({
    onSuccess: () => {
      void utils.inventory.listLocations.invalidate();
      setCode('');
      setName('');
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    opprett.mutate({ code: code.trim(), name: name.trim() });
  }

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-5 px-8 py-7">
      <Sidehode
        tittel="Plass"
        undertittel="Hvor delene fysisk ligger. Koden er den du bruker i hverdagen."
      />
      <LagerPiller />

      {isAdmin && (
        <CardShell className="p-5">
          <form onSubmit={submit} className="flex flex-col gap-4">
            <p className="flex items-center gap-2 text-label text-fg">
              <Plus size={16} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
              Ny lokasjon
            </p>
            <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
              <label className="flex flex-col gap-1.5">
                <span className="text-label text-fg">Kode</span>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  maxLength={32}
                  placeholder="A-03"
                  className="h-control rounded-control border border-border bg-bg px-2.5 font-mono text-body text-fg outline-none placeholder:font-sans placeholder:text-fg-muted/60 focus-visible:border-fg"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-label text-fg">Navn</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={120}
                  placeholder="Hylle A, rad 3"
                  className="h-control rounded-control border border-border bg-bg px-2.5 text-body text-fg outline-none placeholder:text-fg-muted/60 focus-visible:border-fg"
                />
              </label>
            </div>

            {opprett.error && (
              <p className="flex items-start gap-2 text-body text-danger">
                <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
                {opprett.error.message}
              </p>
            )}

            <div className="flex justify-end">
              <StatefulButton
                type="submit"
                disabled={opprett.isPending || !code.trim() || !name.trim()}
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
                Opprett
              </StatefulButton>
            </div>
          </form>
        </CardShell>
      )}

      {lokasjoner.isLoading ? (
        <Laster />
      ) : lokasjoner.isError ? (
        <Feil melding={lokasjoner.error.message} />
      ) : (lokasjoner.data?.length ?? 0) === 0 ? (
        <Tomt
          tittel="Ingen lokasjoner ennå"
          hint="Uten en lokasjon kan ingen bevegelse registreres — delen må ligge et sted."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          {lokasjoner.data?.map((l, i) => (
            <div
              key={l.id}
              className={`flex h-row-store items-center gap-4 bg-bg px-4 ${
                i > 0 ? 'border-border border-t' : ''
              }`}
            >
              <MapPin size={16} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
              <span className="w-24 shrink-0 font-mono text-[12px] text-fg-muted">{l.code}</span>
              <span className="min-w-0 flex-1 truncate text-label text-fg">{l.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
