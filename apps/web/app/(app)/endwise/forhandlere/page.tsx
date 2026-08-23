'use client';

import { Badge, Building2, CircleAlert, Plus, StatefulButton } from '@endwise/ui';
import { type FormEvent, useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../../_shell/cards';

/**
 * F5-26 — FORHANDLERE. Invite-only onboarding.
 *
 * Admin oppretter forhandleren (navn, slug, eier-e-post, live/demo) og
 * krysser av hvilke TILLEGG tenanten får. Eieren setter passord selv via
 * invitasjonslenka. Ingen offentlig /registrer. Ingen modulvelger hos eier.
 */
export default function ForhandlerePage() {
  const utils = trpc.useUtils();
  const liste = trpc.tenants.list.useQuery();
  const katalog = trpc.tenants.addonKatalog.useQuery();
  const entitlements = trpc.tenants.listModules.useQuery();
  const opprett = trpc.tenants.create.useMutation({
    onSuccess: () => {
      void utils.tenants.list.invalidate();
      void utils.tenants.listModules.invalidate();
      setNavn('');
      setSlug('');
      setEpost('');
      setValgte(new Set());
    },
  });
  const sendPaNytt = trpc.tenants.resendOwnerInvite.useMutation({
    onSuccess: () => {
      void utils.tenants.list.invalidate();
    },
  });
  const settModuler = trpc.tenants.setModules.useMutation({
    onSuccess: () => {
      void utils.tenants.listModules.invalidate();
    },
  });

  const [navn, setNavn] = useState('');
  const [slug, setSlug] = useState('');
  const [epost, setEpost] = useState('');
  const [demo, setDemo] = useState(false);
  const [valgte, setValgte] = useState<Set<string>>(new Set());
  const [redigerer, setRedigerer] = useState<string | null>(null);

  const entitlementsKart = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const t of entitlements.data ?? []) {
      m.set(
        t.id,
        t.modules.filter((x) => x.enabled).map((x) => x.moduleKey),
      );
    }
    return m;
  }, [entitlements.data]);

  function navnEndret(v: string) {
    const forrigeForslag = foreslåSlug(navn);
    setNavn(v);
    if (slug === '' || slug === forrigeForslag) setSlug(foreslåSlug(v));
  }

  function toggle(key: string) {
    setValgte((forrige) => {
      const neste = new Set(forrige);
      if (neste.has(key)) neste.delete(key);
      else neste.add(key);
      return neste;
    });
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    opprett.mutate({
      name: navn.trim(),
      slug: slug.trim(),
      ownerEmail: epost.trim(),
      kind: demo ? 'demo' : 'live',
      modules: [...valgte],
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="sr-only">Forhandlere</h1>
        <p className="text-title text-fg">Forhandlere</p>
        <p className="text-body text-fg-muted">
          Invite-only. Du oppretter forhandleren og tildeler tillegg. Eieren setter passord selv —
          du setter det aldri.
        </p>
      </div>

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
            hint="Finnes e-posten ikke, sender vi en invitasjon. Eieren setter passord selv."
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
              className="size-4 accent-[#111]"
            />
            <span className="flex flex-col">
              Demo-tenant
              <span className="text-[12px] text-fg-muted">
                Kun for dev-mode. Ekte forhandlere skal aldri være demo.
              </span>
            </span>
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-label text-fg">Betalte tillegg</legend>
            <p className="text-[12px] text-fg-muted leading-relaxed">
              Basis (Verkstedet, Innboks, Saker, Kunder, Lager, Helpdesk, Settings) er alltid på.
              Bare tillegg krysses av her. Forhandleren velger ikke selv.
            </p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {(katalog.data ?? []).map((m) => (
                <label key={m.key} className="flex items-center gap-2 text-body text-fg">
                  <input
                    type="checkbox"
                    checked={valgte.has(m.key)}
                    onChange={() => toggle(m.key)}
                    className="size-4 accent-[#111]"
                  />
                  <span>
                    {m.label}
                    <span className="ml-1 text-[12px] text-fg-muted">{m.key}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {opprett.error && (
            <p className="flex items-start gap-2 text-body text-danger">
              <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
              {opprett.error.message}
            </p>
          )}
          {opprett.isSuccess && (
            <p className="text-body text-success">
              Opprettet «{opprett.data?.name}». Invitasjon sendt til {opprett.data?.invite.epost}
              {opprett.data?.invite.sendt ? '' : ' — sendingen feilet, bruk Send på nytt'}. Eieren
              setter passord via lenka.
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
              Opprett og inviter
            </StatefulButton>
          </div>
        </form>
      </CardShell>

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
            {liste.data?.map((t, i) => {
              const pa = entitlementsKart.get(t.id) ?? [];
              const apen = redigerer === t.id;
              return (
                <div
                  key={t.id}
                  className={`flex flex-col gap-3 bg-bg px-4 py-3 ${
                    i > 0 ? 'border-border border-t' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <Building2 size={16} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-label text-fg">{t.name}</span>
                      <span className="truncate text-[12px] text-fg-muted">{t.slug}</span>
                    </div>
                    {t.kind === 'demo' && <Badge variant="secondary">Demo</Badge>}
                    <button
                      type="button"
                      onClick={() => setRedigerer(apen ? null : t.id)}
                      className="text-[12px] text-fg-muted underline-offset-2 hover:text-fg hover:underline"
                    >
                      {apen ? 'Lukk' : 'Tillegg'}
                    </button>
                    <button
                      type="button"
                      disabled={sendPaNytt.isPending}
                      onClick={() => sendPaNytt.mutate({ tenantId: t.id })}
                      className="text-[12px] text-fg-muted underline-offset-2 hover:text-fg hover:underline disabled:opacity-50"
                    >
                      Send invitasjon på nytt
                    </button>
                  </div>
                  {pa.length > 0 && !apen ? (
                    <div className="flex flex-wrap gap-1 pl-8">
                      {pa.map((k) => (
                        <Badge key={k} variant="secondary">
                          {k}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  {apen ? (
                    <ModulRediger
                      key={`${t.id}:${pa.join(',')}`}
                      valgte={pa}
                      katalog={katalog.data ?? []}
                      pending={settModuler.isPending}
                      onLagre={(modules) => settModuler.mutate({ tenantId: t.id, modules })}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
        {sendPaNytt.isSuccess && (
          <p className="text-body text-success">
            Invitasjon sendt til {sendPaNytt.data.epost}
            {sendPaNytt.data.sendt ? '.' : ' — sendingen feilet.'}
          </p>
        )}
        {sendPaNytt.isError && (
          <p className="text-body text-danger">{sendPaNytt.error.message}</p>
        )}
        {settModuler.isError && (
          <p className="text-body text-danger">{settModuler.error.message}</p>
        )}
      </section>
    </div>
  );
}

function ModulRediger({
  valgte,
  katalog,
  pending,
  onLagre,
}: {
  valgte: string[];
  katalog: Array<{ key: string; label: string }>;
  pending: boolean;
  onLagre: (modules: string[]) => void;
}) {
  const [lokalt, setLokalt] = useState(() => new Set(valgte));

  return (
    <div className="flex flex-col gap-2 pl-8">
      <div className="grid gap-1.5 sm:grid-cols-2">
        {katalog.map((m) => (
          <label key={m.key} className="flex items-center gap-2 text-body text-fg">
            <input
              type="checkbox"
              checked={lokalt.has(m.key)}
              onChange={() => {
                setLokalt((forrige) => {
                  const neste = new Set(forrige);
                  if (neste.has(m.key)) neste.delete(m.key);
                  else neste.add(m.key);
                  return neste;
                });
              }}
              className="size-4 accent-[#111]"
            />
            {m.label}
          </label>
        ))}
      </div>
      <div className="flex justify-end">
        <StatefulButton
          type="button"
          disabled={pending}
          state={pending ? 'loading' : 'idle'}
          loadingText="Lagrer…"
          onClick={() => onLagre([...lokalt])}
        >
          Lagre tillegg
        </StatefulButton>
      </div>
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
