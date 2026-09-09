'use client';

import { FELT_MD, StatefulButton } from '@endwise/ui';
import { type FormEvent, useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useLyd } from '../../_lib/lyd';
import { OrgRad } from '../_org-rad';

const INPUT = `${FELT_MD} disabled:bg-surface-2 disabled:text-fg-muted`;

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

type RadNokkel = keyof Skjema | null;

/**
 * Organisasjon › Oversikt — Innstillinger-rader (label · verdi · Endre).
 * Ikke CardShell-skjema. Slug er lesing.
 */
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
  const [apen, setApen] = useState<RadNokkel>(null);

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
      setApen(null);
      lyd.suksess();
    },
    onError: () => lyd.feil(),
  });

  function toggle(nokkel: RadNokkel) {
    setApen((forrige) => (forrige === nokkel ? null : nokkel));
  }

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

  const leftover: Record<string, unknown> =
    vis.leftover && typeof vis.leftover === 'object' && !Array.isArray(vis.leftover)
      ? (vis.leftover as Record<string, unknown>)
      : {};
  const leftoverKeys = Object.keys(leftover);

  return (
    <div data-org-oversikt className="flex flex-col">
      <form onSubmit={onSubmit} className="flex flex-col">
        <OrgRad
          label="Firmanavn"
          verdi={skjema.name}
          apen={apen === 'name'}
          onEndre={() => toggle('name')}
          lesing={lesing}
        >
          <OrgFelt
            label="Firmanavn"
            value={skjema.name}
            onChange={(name) => setSkjema((s) => ({ ...s, name }))}
          />
        </OrgRad>
        <OrgRad label="Slug" verdi={vis.slug || '—'} lesing />
        <OrgRad
          label="Orgnr"
          verdi={skjema.orgnr}
          apen={apen === 'orgnr'}
          onEndre={() => toggle('orgnr')}
          lesing={lesing}
        >
          <OrgFelt
            label="Orgnr"
            value={skjema.orgnr}
            onChange={(orgnr) => setSkjema((s) => ({ ...s, orgnr }))}
          />
        </OrgRad>
        <OrgRad
          label="Adresse"
          verdi={skjema.address}
          apen={apen === 'address'}
          onEndre={() => toggle('address')}
          lesing={lesing}
        >
          <OrgFelt
            label="Adresse"
            value={skjema.address}
            onChange={(address) => setSkjema((s) => ({ ...s, address }))}
          />
        </OrgRad>
        <OrgRad
          label="Postnr"
          verdi={skjema.postalCode}
          apen={apen === 'postalCode'}
          onEndre={() => toggle('postalCode')}
          lesing={lesing}
        >
          <OrgFelt
            label="Postnr"
            value={skjema.postalCode}
            onChange={(postalCode) => setSkjema((s) => ({ ...s, postalCode }))}
          />
        </OrgRad>
        <OrgRad
          label="Poststed"
          verdi={skjema.city}
          apen={apen === 'city'}
          onEndre={() => toggle('city')}
          lesing={lesing}
        >
          <OrgFelt
            label="Poststed"
            value={skjema.city}
            onChange={(city) => setSkjema((s) => ({ ...s, city }))}
          />
        </OrgRad>
        <OrgRad
          label="Telefon"
          verdi={skjema.phone}
          apen={apen === 'phone'}
          onEndre={() => toggle('phone')}
          lesing={lesing}
        >
          <OrgFelt
            label="Telefon"
            value={skjema.phone}
            onChange={(phone) => setSkjema((s) => ({ ...s, phone }))}
          />
        </OrgRad>
        <OrgRad
          label="Forhandler-epost"
          verdi={skjema.email}
          apen={apen === 'email'}
          onEndre={() => toggle('email')}
          lesing={lesing}
        >
          <OrgFelt
            label="Forhandler-epost"
            value={skjema.email}
            onChange={(email) => setSkjema((s) => ({ ...s, email }))}
            type="email"
          />
        </OrgRad>
        <OrgRad
          label="Nettside"
          verdi={skjema.website}
          apen={apen === 'website'}
          onEndre={() => toggle('website')}
          lesing={lesing}
          siste={leftoverKeys.length === 0 && lesing}
        >
          <OrgFelt
            label="Nettside"
            value={skjema.website}
            onChange={(website) => setSkjema((s) => ({ ...s, website }))}
          />
        </OrgRad>

        {leftoverKeys.length > 0 ? (
          <details className="border-border border-b px-0 py-4">
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
          <div className="flex flex-col gap-2 py-4">
            <div className="flex justify-end">
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
            </div>
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
    </div>
  );
}

function OrgFelt({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="sr-only">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
