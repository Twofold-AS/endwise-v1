'use client';

import { Badge, Building2, CircleAlert, Plus, StatefulButton } from '@endwise/ui';
import { type FormEvent, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../../_shell/cards';

/**
 * F5-26 — FORHANDLERE. Endwise-admins første flate, og byggesteg 1: det er
 * herfra en tenant opprettes.
 *
 * ⛔ **Vi oppretter ikke kontoer på andres vegne.** Eieren må være en bruker
 * som allerede finnes; skjemaet tar e-post og slår den opp. Alternativet —
 * å la admin sette passord for andre — er en dev-snartvei fra seeden som ikke
 * hører hjemme i en flate.
 *
 * Sperren er `endwiseAdminProcedure` server-side, ikke at siden ligger under
 * en kontekst en forhandler ikke ser.
 */
export default function ForhandlerePage() {
  const utils = trpc.useUtils();
  const liste = trpc.tenants.list.useQuery();
  const opprett = trpc.tenants.create.useMutation({
    onSuccess: () => {
      utils.tenants.list.invalidate();
      setNavn('');
      setSlug('');
      setEpost('');
    },
  });

  const [navn, setNavn] = useState('');
  const [slug, setSlug] = useState('');
  const [epost, setEpost] = useState('');
  const [demo, setDemo] = useState(false);

  /** Foreslår slug fra navnet, men overstyrer aldri det brukeren har skrevet. */
  function navnEndret(v: string) {
    const forrigeForslag = foreslåSlug(navn);
    setNavn(v);
    if (slug === '' || slug === forrigeForslag) setSlug(foreslåSlug(v));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    opprett.mutate({
      name: navn.trim(),
      slug: slug.trim(),
      ownerEmail: epost.trim(),
      kind: demo ? 'demo' : 'live',
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="sr-only">Forhandlere</h1>
        <p className="text-title text-fg">Forhandlere</p>
        <p className="text-body text-fg-muted">
          Hver forhandler er en tenant. Navnet du setter her er det som vises i deres sidebar.
        </p>
      </div>

      {/* ── Opprett ────────────────────────────────────────────────────── */}
      <CardShell className="p-5">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <p className="flex items-center gap-2 text-label text-fg">
            <Plus size={16} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
            Ny forhandler
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <Felt
              label="Navn"
              hint="Ekte forhandlernavn — vises i deres sidebar"
              value={navn}
              onChange={navnEndret}
              placeholder="Sørlandet MC-verksted"
              required
            />
            <Felt
              label="Slug"
              hint="Små bokstaver, tall og bindestrek. Havner i URL-er."
              value={slug}
              onChange={setSlug}
              placeholder="sorlandet-mc"
              required
            />
          </div>

          <Felt
            label="E-post til eier"
            hint="Brukeren må finnes fra før. Vi oppretter ikke kontoer på andres vegne."
            value={epost}
            onChange={setEpost}
            placeholder="eier@verksted.no"
            type="email"
            required
          />

          <label className="flex items-center gap-2.5 text-label text-fg">
            <input
              type="checkbox"
              checked={demo}
              onChange={(e) => setDemo(e.target.checked)}
              className="size-4 accent-black"
            />
            <span className="flex flex-col">
              Demo-tenant
              <span className="text-[12px] text-fg-muted">
                Kun for dev-mode. Ekte forhandlere skal aldri være demo.
              </span>
            </span>
          </label>

          {opprett.error && (
            <p className="flex items-start gap-2 text-body text-danger">
              <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
              {opprett.error.message}
            </p>
          )}
          {opprett.isSuccess && (
            <p className="text-body text-success">
              Opprettet «{opprett.data?.name}». Eieren er nå dealer_admin i den.
            </p>
          )}

          <div className="flex justify-end">
            <StatefulButton
              type="submit"
              disabled={opprett.isPending || !navn || !slug || !epost}
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
              Opprett forhandler
            </StatefulButton>
          </div>
        </form>
      </CardShell>

      {/* ── Liste ──────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-2">
        <h2 className="text-title text-fg">Alle forhandlere</h2>

        {liste.isLoading ? (
          <p className="py-10 text-center text-body text-fg-muted">Laster …</p>
        ) : liste.isError ? (
          <CardShell className="p-6">
            <p className="text-body text-danger">{liste.error.message}</p>
          </CardShell>
        ) : (liste.data?.length ?? 0) === 0 ? (
          <CardShell className="p-10 text-center">
            <p className="text-label text-fg">Ingen forhandlere ennå</p>
            <p className="mt-1 text-[12px] text-fg-muted">Opprett den første i skjemaet over.</p>
          </CardShell>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            {liste.data?.map((t, i) => (
              <div
                key={t.id}
                className={`flex h-row-store items-center gap-4 bg-bg px-4 ${
                  i > 0 ? 'border-border border-t' : ''
                }`}
              >
                <Building2 size={16} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-label text-fg">{t.name}</span>
                  <span className="truncate text-[12px] text-fg-muted">{t.slug}</span>
                </div>
                {t.kind === 'demo' && <Badge variant="secondary">Demo</Badge>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function foreslåSlug(navn: string): string {
  return navn
    .toLowerCase()
    .replace(/[æå]/g, 'a')
    .replace(/ø/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function Felt({
  label,
  hint,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-label text-fg">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-control rounded-control border border-border bg-bg px-2.5 text-body text-fg outline-none placeholder:text-fg-muted/60 focus-visible:border-fg"
      />
      <span className="text-[12px] text-fg-muted">{hint}</span>
    </label>
  );
}
