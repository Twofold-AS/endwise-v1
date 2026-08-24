'use client';

import {
  Badge,
  Building2,
  CircleAlert,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Plus,
  StatefulButton,
} from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { type FormEvent, useMemo, useState } from 'react';
import { Field, INPUT } from '@/app/_auth/felter';
import { trpc } from '@/lib/trpc';
import { useOrgRole } from '../../_lib/use-org-role';
import { CardShell } from '../../_shell/cards';
import { NivaaValg, TilleggListe, tilleggForNivaa, tilleggNokler } from '../_pakke-valg';

/**
 * F5-26 — FORHANDLERE. Invite-only onboarding.
 *
 * Admin velger ett nivå (TIERS) og krysser av TILLEGG som ikke allerede
 * ligger i pakken. Eieren setter passord, 2FA og går gjennom veiviseren.
 * Endwise-tenanten kan ikke inviteres på nytt, slettes eller få ny pakke.
 */
type SlettSteg = 'advarsel' | 'bekreft';

export default function ForhandlerePage() {
  const { isEndwiseAdmin } = useOrgRole();
  const utils = trpc.useUtils();
  const liste = trpc.tenants.list.useQuery();
  const katalog = trpc.tenants.pakkeKatalog.useQuery(undefined, { enabled: isEndwiseAdmin });
  const entitlements = trpc.tenants.listModules.useQuery(undefined, { enabled: isEndwiseAdmin });

  const [navn, setNavn] = useState('');
  const [slug, setSlug] = useState('');
  const [epost, setEpost] = useState('');
  const [demo, setDemo] = useState(false);
  const [nivaa, setNivaa] = useState('start');
  const [valgfrie, setValgfrie] = useState<Set<string>>(new Set());
  const [redigerer, setRedigerer] = useState<string | null>(null);
  const [endrer, setEndrer] = useState<string | null>(null);
  const [slettMal, setSlettMal] = useState<string | null>(null);
  const [slettSteg, setSlettSteg] = useState<SlettSteg>('advarsel');
  const [slettSlug, setSlettSlug] = useState('');
  const [slettKode, setSlettKode] = useState('');
  const [slettMelding, setSlettMelding] = useState<string | null>(null);
  const [pakkeLagretId, setPakkeLagretId] = useState<string | null>(null);

  const nivaaListe = katalog.data?.nivaa ?? [];
  const valgtNivaa = nivaaListe.find((n) => n.key === nivaa);
  const tillegg = useMemo(
    () => tilleggForNivaa(valgtNivaa, katalog.data?.tillegg ?? []),
    [valgtNivaa, katalog.data?.tillegg],
  );

  const entitlementsKart = useMemo(() => {
    const m = new Map<string, { included: string[]; optional: string[]; plan: string | null }>();
    for (const t of entitlements.data ?? []) {
      const plan = t.plan ?? 'start';
      const nivaaRad = nivaaListe.find((n) => n.key === plan);
      m.set(t.id, {
        plan,
        included: tilleggNokler(
          t.modules
            .filter((x) => x.enabled && (x.source === 'included' || x.source === 'stripe'))
            .map((x) => x.moduleKey),
          katalog.data?.tillegg ?? [],
          nivaaRad,
        ),
        optional: tilleggNokler(
          t.modules
            .filter((x) => x.source === 'optional' || x.source === 'dealer')
            .map((x) => x.moduleKey),
          katalog.data?.tillegg ?? [],
          nivaaRad,
        ),
      });
    }
    return m;
  }, [entitlements.data, katalog.data?.tillegg, nivaaListe]);

  const opprett = trpc.tenants.create.useMutation({
    onSuccess: () => {
      void utils.tenants.list.invalidate();
      void utils.tenants.listModules.invalidate();
      setNavn('');
      setSlug('');
      setEpost('');
      setNivaa('start');
      setValgfrie(new Set());
    },
  });
  const oppdater = trpc.tenants.update.useMutation({
    onSuccess: () => {
      void utils.tenants.list.invalidate();
      setEndrer(null);
    },
  });
  const sendPaNytt = trpc.tenants.resendOwnerInvite.useMutation({
    onSuccess: () => {
      void utils.tenants.list.invalidate();
    },
  });
  const settModuler = trpc.tenants.setModules.useMutation({
    onSuccess: (data) => {
      void utils.tenants.listModules.invalidate();
      void utils.tenants.list.invalidate();
      setPakkeLagretId(data.tenantId);
    },
  });
  const sendSlettKode = trpc.tenants.sendSlettKode.useMutation();
  const slett = trpc.tenants.slett.useMutation({
    onSuccess: (data) => {
      void utils.tenants.list.invalidate();
      void utils.tenants.listModules.invalidate();
      setSlettMal(null);
      setSlettSteg('advarsel');
      setSlettSlug('');
      setSlettKode('');
      setSlettMelding(`«${data.name}» er slettet.`);
    },
  });

  function navnEndret(v: string) {
    const forrigeForslag = foreslåSlug(navn);
    setNavn(v);
    if (slug === '' || slug === forrigeForslag) setSlug(foreslåSlug(v));
  }

  function byttNivaa(key: string) {
    const neste = nivaaListe.find((n) => n.key === key);
    const lovlige = new Set(tilleggForNivaa(neste, katalog.data?.tillegg ?? []).map((t) => t.key));
    setNivaa(key);
    setValgfrie(new Set([...valgfrie].filter((k) => lovlige.has(k))));
  }

  function toggle(sett: Set<string>, setSett: (n: Set<string>) => void, key: string) {
    const neste = new Set(sett);
    if (neste.has(key)) neste.delete(key);
    else neste.add(key);
    setSett(neste);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    opprett.mutate({
      name: navn.trim(),
      slug: slug.trim(),
      ownerEmail: epost.trim(),
      kind: demo ? 'demo' : 'live',
      tier: nivaa as 'start' | 'pro' | 'enterprise',
      included: [],
      optional: [...valgfrie],
    });
  }

  const slettRad = liste.data?.find((t) => t.id === slettMal);
  const slugTreffer = Boolean(slettRad && slettSlug.trim() === slettRad.slug);
  const kodeKlar = /^\d{6}$/.test(slettKode.trim());

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="sr-only">Forhandlere</h1>
        <p className="text-title text-fg">Forhandlere</p>
        <p className="text-body text-fg-muted">
          {isEndwiseAdmin
            ? 'Invite-only. Velg én pakke. Tillegg under er utenom pakken. Eieren setter passord og 2FA selv — du setter det aldri.'
            : 'Kun lesing. Åpne et verksted uten å bytte organisasjon.'}
        </p>
      </div>

      {isEndwiseAdmin ? (
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

            <NivaaValg nivaa={nivaaListe} valgt={nivaa} onChange={byttNivaa} />
            <TilleggListe
              tillegg={tillegg}
              valgte={valgfrie}
              nivaaNavn={valgtNivaa?.name ?? 'Start'}
              onToggle={(key) => toggle(valgfrie, setValgfrie, key)}
            />

            {opprett.error && (
              <p className="flex items-start gap-2 text-body text-danger">
                <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
                {opprett.error.message}
              </p>
            )}
            {opprett.isSuccess && (
              <p className="text-body text-success">
                Opprettet «{opprett.data?.name}». Invitasjon sendt til {opprett.data?.invite.epost}
                {opprett.data?.invite.sendt
                  ? ''
                  : ' — sendingen feilet, bruk Send invitasjon på nytt'}
                . Eieren setter passord, 2FA og går gjennom veiviseren.
              </p>
            )}

            <div className="flex justify-end">
              <StatefulButton
                type="submit"
                disabled={opprett.isPending || !navn || !slug || !epost || !nivaa}
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
      ) : null}

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
              const pakke = entitlementsKart.get(t.id) ?? {
                included: [],
                optional: [],
                plan: t.plan,
              };
              const apen = redigerer === t.id;
              const planNavn = nivaaListe.find((n) => n.key === (t.plan ?? pakke.plan))?.name;
              return (
                <div
                  key={t.id}
                  className={`flex flex-col gap-3 bg-bg px-4 py-3 ${
                    i > 0 ? 'border-border border-t' : ''
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <Building2 size={16} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-label text-fg">{t.name}</span>
                      <span className="truncate text-[12px] text-fg-muted">{t.slug}</span>
                    </div>
                    {t.kind === 'demo' ? <Badge variant="secondary">Demo</Badge> : null}
                    {planNavn ? <Badge variant="outline">{planNavn}</Badge> : null}
                    <Link
                      href={`/endwise/verksted/${t.slug}/dashboard?fra=forhandlere` as Route}
                      className="text-[12px] text-fg-muted underline-offset-2 hover:text-fg hover:underline"
                    >
                      Se verkstedet
                    </Link>
                    {isEndwiseAdmin && !t.erEndwise ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setEndrer(endrer === t.id ? null : t.id)}
                          className="text-[12px] text-fg-muted underline-offset-2 hover:text-fg hover:underline"
                        >
                          {endrer === t.id ? 'Lukk' : 'Endre'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRedigerer(apen ? null : t.id)}
                          className="text-[12px] text-fg-muted underline-offset-2 hover:text-fg hover:underline"
                        >
                          {apen ? 'Lukk pakke' : 'Endre pakke'}
                        </button>
                        {t.eierInviteUbrukt ? (
                          <button
                            type="button"
                            disabled={sendPaNytt.isPending}
                            onClick={() => sendPaNytt.mutate({ tenantId: t.id })}
                            className="text-[12px] text-fg-muted underline-offset-2 hover:text-fg hover:underline disabled:opacity-50"
                          >
                            Send invitasjon på nytt
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            setSlettMal(t.id);
                            setSlettSteg('advarsel');
                            setSlettSlug('');
                            setSlettKode('');
                            sendSlettKode.reset();
                            slett.reset();
                          }}
                          className="text-[12px] text-danger underline-offset-2 hover:underline"
                        >
                          Slett
                        </button>
                      </>
                    ) : null}
                  </div>
                  {(pakke.included.length > 0 || pakke.optional.length > 0) &&
                  !apen &&
                  isEndwiseAdmin &&
                  !t.erEndwise ? (
                    <div className="flex flex-wrap gap-1 pl-8">
                      {pakke.included.map((k) => (
                        <Badge key={k} variant="secondary">
                          {k}
                        </Badge>
                      ))}
                      {pakke.optional.map((k) => (
                        <Badge key={`opt-${k}`} variant="outline">
                          valgfritt: {k}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  {endrer === t.id && isEndwiseAdmin && !t.erEndwise ? (
                    <EndreForhandler
                      navn={t.name}
                      slug={t.slug}
                      eierEpost={t.eierEpost}
                      demo={t.kind === 'demo'}
                      pending={oppdater.isPending}
                      feil={oppdater.error?.message}
                      onLagre={(felt) =>
                        oppdater.mutate({
                          tenantId: t.id,
                          name: felt.navn,
                          slug: felt.slug,
                          kind: felt.demo ? 'demo' : 'live',
                        })
                      }
                    />
                  ) : null}
                  {apen && isEndwiseAdmin && !t.erEndwise ? (
                    <ModulRediger
                      key={`${t.id}:${t.plan ?? 'start'}:${pakke.included.join(',')}:${pakke.optional.join(',')}`}
                      plan={t.plan ?? 'start'}
                      included={pakke.included}
                      optional={pakke.optional}
                      nivaa={nivaaListe}
                      tillegg={katalog.data?.tillegg ?? []}
                      pending={settModuler.isPending}
                      lagret={pakkeLagretId === t.id}
                      onLagre={(tier, included, optional) =>
                        settModuler.mutate({ tenantId: t.id, tier, included, optional })
                      }
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
        {slettMelding ? <p className="text-body text-success">{slettMelding}</p> : null}
        {sendPaNytt.isSuccess && (
          <p className="text-body text-success">
            Invitasjon sendt til {sendPaNytt.data.epost}
            {sendPaNytt.data.sendt ? '.' : ' — sendingen feilet.'}
          </p>
        )}
        {sendPaNytt.isError && <p className="text-body text-danger">{sendPaNytt.error.message}</p>}
        {settModuler.isError && (
          <p className="text-body text-danger">{settModuler.error.message}</p>
        )}
        {oppdater.isError && endrer === null ? (
          <p className="text-body text-danger">{oppdater.error.message}</p>
        ) : null}
      </section>

      <Dialog
        open={Boolean(slettRad)}
        onOpenChange={(open) => {
          if (!open) {
            setSlettMal(null);
            setSlettSteg('advarsel');
            setSlettSlug('');
            setSlettKode('');
          }
        }}
      >
        <DialogContent className="left-1/2 top-1/2 w-[min(480px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 p-5">
          {slettRad && slettSteg === 'advarsel' ? (
            <div className="flex flex-col gap-4">
              <DialogTitle className="text-title text-fg">Slett {slettRad.name}?</DialogTitle>
              <DialogDescription className="text-body text-fg-muted">
                Dette sletter forhandleren, ansatte, saker og kundedata hos oss. Det kan ikke
                angres. Du kan ikke slette ved et uhell — neste steg krever slug og en engangskode.
              </DialogDescription>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSlettMal(null)}
                  className="inline-flex h-control items-center rounded-control px-3 text-label text-fg-muted hover:text-fg"
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  onClick={() => setSlettSteg('bekreft')}
                  className="inline-flex h-control items-center rounded-control bg-danger px-4 text-label text-white"
                >
                  Fortsett
                </button>
              </div>
            </div>
          ) : null}
          {slettRad && slettSteg === 'bekreft' ? (
            <div className="flex flex-col gap-4">
              <DialogTitle className="text-title text-fg">Slett {slettRad.name}?</DialogTitle>
              <DialogDescription className="text-body text-fg-muted">
                Skriv slug-en nøyaktig, og bekreft med engangskoden vi sender til deg.
              </DialogDescription>
              <Felt
                label="Slug"
                hint={
                  slugTreffer || slettSlug.trim() === ''
                    ? 'Må stemme nøyaktig med den lagrede slug-en.'
                    : `Slug stemmer ikke. Du sletter ikke ${slettRad.name}.`
                }
                value={slettSlug}
                onChange={setSlettSlug}
                placeholder={slettRad.slug}
                autoComplete="off"
              />
              <Field id="slett-otp" label="Engangskode">
                <input
                  id="slett-otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={slettKode}
                  onChange={(e) => setSlettKode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`${INPUT} text-center font-mono text-[16px] tracking-[0.5em] tabular-nums`}
                />
              </Field>
              <div className="flex flex-wrap items-center gap-2">
                <StatefulButton
                  type="button"
                  disabled={sendSlettKode.isPending}
                  state={
                    sendSlettKode.isPending
                      ? 'loading'
                      : sendSlettKode.isSuccess
                        ? 'success'
                        : 'idle'
                  }
                  loadingText="Sender kode…"
                  successText="Kode sendt"
                  onClick={() => sendSlettKode.mutate({ tenantId: slettRad.id })}
                >
                  Send kode
                </StatefulButton>
                {sendSlettKode.isSuccess ? (
                  <p className="text-[12px] text-fg-muted">
                    Vi har sendt en kode til {sendSlettKode.data.epost}.
                  </p>
                ) : null}
              </div>
              {sendSlettKode.error ? (
                <p className="text-body text-danger">{sendSlettKode.error.message}</p>
              ) : null}
              {slett.error ? <p className="text-body text-danger">{slett.error.message}</p> : null}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSlettMal(null)}
                  className="inline-flex h-control items-center rounded-control px-3 text-label text-fg-muted hover:text-fg"
                >
                  Avbryt
                </button>
                <StatefulButton
                  type="button"
                  disabled={!slugTreffer || !kodeKlar || slett.isPending}
                  state={slett.isPending ? 'loading' : slett.isError ? 'error' : 'idle'}
                  loadingText="Sletter…"
                  errorText="Feilet"
                  className="bg-danger text-white hover:bg-danger/90"
                  onClick={() =>
                    slett.mutate({
                      tenantId: slettRad.id,
                      slug: slettSlug.trim(),
                      kode: slettKode.trim(),
                    })
                  }
                >
                  Slett forhandleren
                </StatefulButton>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EndreForhandler({
  navn,
  slug,
  eierEpost,
  demo,
  pending,
  feil,
  onLagre,
}: {
  navn: string;
  slug: string;
  eierEpost: string | null;
  demo: boolean;
  pending: boolean;
  feil?: string;
  onLagre: (felt: { navn: string; slug: string; demo: boolean }) => void;
}) {
  const [navnFelt, setNavnFelt] = useState(navn);
  const [slugFelt, setSlugFelt] = useState(slug);
  const [demoFelt, setDemoFelt] = useState(demo);

  return (
    <div className="flex flex-col gap-3 pl-8">
      <Felt
        label="Navn"
        hint="Vises i sidebaren hos forhandleren."
        value={navnFelt}
        onChange={setNavnFelt}
        placeholder={navn}
      />
      <Felt
        label="Slug"
        hint="Endrer du slug, endres URL-er som peker hit. Gammelt slugs virker ikke lenger."
        value={slugFelt}
        onChange={setSlugFelt}
        placeholder={slug}
      />
      <p className="text-[12px] text-fg-muted">
        Eier: {eierEpost ?? 'ingen e-post'} — du bytter den aldri her. Bruk Send invitasjon på nytt
        om lenka er ubrukt.
      </p>
      <label className="flex items-center gap-2.5 text-label text-fg">
        <input
          type="checkbox"
          checked={demoFelt}
          onChange={(e) => setDemoFelt(e.target.checked)}
          className="size-4 accent-[#111]"
        />
        Demo-tenant
      </label>
      {feil ? <p className="text-body text-danger">{feil}</p> : null}
      <div className="flex justify-end">
        <StatefulButton
          type="button"
          disabled={pending || navnFelt.trim().length < 2 || slugFelt.trim().length < 2}
          state={pending ? 'loading' : 'idle'}
          loadingText="Lagrer…"
          onClick={() => onLagre({ navn: navnFelt.trim(), slug: slugFelt.trim(), demo: demoFelt })}
        >
          Lagre
        </StatefulButton>
      </div>
    </div>
  );
}

function ModulRediger({
  plan,
  included,
  optional,
  nivaa,
  tillegg,
  pending,
  lagret,
  onLagre,
}: {
  plan: string;
  included: string[];
  optional: string[];
  nivaa: Array<{
    key: string;
    name: string;
    priceMonthlyMinor: number;
    pitch: string;
    hoydepunkter: string[];
    modules: string[];
  }>;
  tillegg: Array<{ key: string; name: string; desc: string; module: string }>;
  pending: boolean;
  lagret: boolean;
  onLagre: (tier: 'start' | 'pro' | 'enterprise', included: string[], optional: string[]) => void;
}) {
  const [valgt, setValgt] = useState(plan);
  const [valg, setValg] = useState(() => new Set([...optional, ...included]));
  const valgtNivaa = nivaa.find((n) => n.key === valgt);
  const synlige = tilleggForNivaa(valgtNivaa, tillegg);

  function byttNivaa(key: string) {
    const neste = nivaa.find((n) => n.key === key);
    const lovlige = new Set(tilleggForNivaa(neste, tillegg).map((t) => t.key));
    setValgt(key);
    setValg(new Set([...valg].filter((k) => lovlige.has(k))));
  }

  return (
    <div className="flex flex-col gap-3 pl-8">
      <NivaaValg nivaa={nivaa} valgt={valgt} onChange={byttNivaa} />
      <TilleggListe
        tillegg={synlige}
        valgte={valg}
        nivaaNavn={valgtNivaa?.name ?? 'Start'}
        onToggle={(key) => {
          const neste = new Set(valg);
          if (neste.has(key)) neste.delete(key);
          else neste.add(key);
          setValg(neste);
        }}
      />
      <div className="flex items-center justify-end gap-3">
        {lagret ? <p className="text-[12px] text-success">Pakken er lagret.</p> : null}
        <StatefulButton
          type="button"
          disabled={pending}
          state={pending ? 'loading' : lagret ? 'success' : 'idle'}
          loadingText="Lagrer…"
          successText="Lagret"
          onClick={() => onLagre(valgt as 'start' | 'pro' | 'enterprise', [], [...valg])}
        >
          Lagre pakke
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
  autoComplete,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-label text-fg">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="h-control rounded-control border border-border bg-bg px-2.5 text-body text-fg outline-none placeholder:text-fg-muted/60 focus-visible:border-fg"
      />
      <span className="text-[12px] text-fg-muted">{hint}</span>
    </label>
  );
}
