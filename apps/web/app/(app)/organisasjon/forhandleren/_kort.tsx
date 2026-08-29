'use client';

import { StatefulButton } from '@endwise/ui';
import { type FormEvent, useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useLyd } from '../../_lib/lyd';
import { CardShell } from '../../_shell/cards';

const INPUT =
  'h-control rounded-control border border-border bg-bg px-2.5 text-body text-fg outline-none placeholder:text-fg-muted/60 focus-visible:border-fg disabled:bg-surface-2 disabled:text-fg-muted';

type Skjema = {
  name: string;
  orgnr: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
  website: string;
};

const TOMT: Skjema = {
  name: '',
  orgnr: '',
  address: '',
  postalCode: '',
  city: '',
  phone: '',
  email: '',
  website: '',
};

export function ForhandlerKort({ lesing = false, slug }: { lesing?: boolean; slug?: string }) {
  const utils = trpc.useUtils();
  const lyd = useLyd();
  const dealer = trpc.forhandler.get.useQuery(undefined, { enabled: !lesing && !slug });
  const inspect = trpc.verksted.forhandleren.useQuery(
    { slug: slug ?? '' },
    { enabled: lesing && Boolean(slug), retry: false },
  );
  const data = lesing ? inspect.data?.kort : dealer.data;
  const laster = lesing ? inspect.isLoading : dealer.isLoading;

  const [skjema, setSkjema] = useState<Skjema>(TOMT);

  useEffect(() => {
    if (!data) return;
    setSkjema({
      name: data.name,
      orgnr: data.orgnr,
      address: data.address,
      postalCode: data.postalCode,
      city: data.city,
      phone: data.phone,
      email: data.email,
      website: data.website,
    });
  }, [data]);

  const lagre = trpc.forhandler.update.useMutation({
    onSuccess: () => {
      void utils.forhandler.get.invalidate();
      void utils.session.me.invalidate();
      lyd.suksess();
    },
    onError: () => lyd.feil(),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (lesing) return;
    lagre.mutate({
      name: skjema.name,
      orgnr: skjema.orgnr,
      address: skjema.address,
      postalCode: skjema.postalCode,
      city: skjema.city,
      phone: skjema.phone,
      email: skjema.email,
      website: skjema.website,
    });
  }

  if (laster) {
    return <p className="px-1 py-6 text-body text-fg-muted">Laster forhandleren …</p>;
  }

  /**
   * Tomt kort når `dealer_profiles` mangler eller `get` degraderer.
   * Aldri «feil» — samme ærlighet som `forhandler.kort`.
   */
  const vis = data ?? {
    name: skjema.name,
    slug: '',
    leftover: {},
  };

  const leftover =
    vis.leftover && typeof vis.leftover === 'object' && !Array.isArray(vis.leftover)
      ? vis.leftover
      : {};
  const leftoverKeys = Object.keys(leftover);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <CardShell className="flex flex-col gap-4 p-4">
        <Felt
          label="Firmanavn"
          value={skjema.name}
          onChange={(name) => setSkjema((s) => ({ ...s, name }))}
          disabled={lesing}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-label text-fg">Slug</span>
          <input value={vis.slug} readOnly disabled className={INPUT} aria-label="Slug" />
          <span className="text-[12px] text-fg-muted">
            Settes ved opprettelse. Quick overskriver den ikke.
          </span>
        </label>
        <Felt
          label="Orgnr"
          value={skjema.orgnr}
          onChange={(orgnr) => setSkjema((s) => ({ ...s, orgnr }))}
          disabled={lesing}
        />
        <Felt
          label="Adresse"
          value={skjema.address}
          onChange={(address) => setSkjema((s) => ({ ...s, address }))}
          disabled={lesing}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Felt
            label="Postnr"
            value={skjema.postalCode}
            onChange={(postalCode) => setSkjema((s) => ({ ...s, postalCode }))}
            disabled={lesing}
          />
          <Felt
            label="Poststed"
            value={skjema.city}
            onChange={(city) => setSkjema((s) => ({ ...s, city }))}
            disabled={lesing}
          />
        </div>
        <Felt
          label="Telefon"
          value={skjema.phone}
          onChange={(phone) => setSkjema((s) => ({ ...s, phone }))}
          disabled={lesing}
        />
        <Felt
          label="Forhandler-epost"
          value={skjema.email}
          onChange={(email) => setSkjema((s) => ({ ...s, email }))}
          disabled={lesing}
          type="email"
        />
        <Felt
          label="Nettside"
          value={skjema.website}
          onChange={(website) => setSkjema((s) => ({ ...s, website }))}
          disabled={lesing}
        />
      </CardShell>

      {leftoverKeys.length > 0 ? (
        <details className="rounded-xl border border-border px-4 py-3">
          <summary className="cursor-pointer text-label text-fg">Mer fra Quick</summary>
          <ul className="mt-3 flex flex-col gap-1.5 text-[12px] text-fg-muted">
            {leftoverKeys.map((key) => (
              <li key={key}>
                <span className="text-fg">{key}</span>
                {': '}
                {formatLeftover(leftover[key])}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {lesing ? null : (
        <div className="flex flex-col gap-2">
          <StatefulButton
            type="submit"
            disabled={lagre.isPending || !skjema.name.trim()}
            state={
              lagre.isPending
                ? 'loading'
                : lagre.isError
                  ? 'error'
                  : lagre.isSuccess
                    ? 'success'
                    : 'idle'
            }
            loadingText="Lagrer…"
            successText="Lagret"
            errorText="Feilet"
          >
            Lagre
          </StatefulButton>
          {lagre.error ? (
            <p className="text-body text-danger">{lagre.error.message}</p>
          ) : (
            <p className="text-[11px] text-fg-muted">
              Dette er verkstedets kontakt, ikke innloggings-e-posten din.
            </p>
          )}
        </div>
      )}
    </form>
  );
}

function Felt({
  label,
  value,
  onChange,
  disabled,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-label text-fg">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={label}
        className={INPUT}
      />
    </label>
  );
}

function formatLeftover(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return '—';
  }
}
