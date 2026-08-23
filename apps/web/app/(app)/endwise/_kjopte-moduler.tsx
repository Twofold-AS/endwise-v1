'use client';

import { Badge, StatefulButton } from '@endwise/ui';
import { useState } from 'react';
import type { RouterOutput } from '@/lib/trpc';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../_shell/cards';
import { NivaaValg, TilleggListe, tilleggForNivaa, tilleggNokler } from './_pakke-valg';

type Rad = RouterOutput['tenants']['listModules'][number];

/**
 * F1-07 / F0-04 / F5-26 — `tenant_modules` per forhandler.
 * Samme nivå + tillegg som /endwise/forhandlere. Endwise-tenanten redigeres ikke.
 */
export function KjopteModulerTabell({
  rader,
  laster,
  feil,
}: {
  rader: Rad[] | undefined;
  laster: boolean;
  feil?: string;
}) {
  const utils = trpc.useUtils();
  const katalog = trpc.tenants.pakkeKatalog.useQuery();
  const sett = trpc.tenants.setModules.useMutation({
    onSuccess: () => {
      void utils.tenants.listModules.invalidate();
    },
  });
  const [apen, setApen] = useState<string | null>(null);

  if (feil) {
    return (
      <CardShell className="p-6">
        <p className="text-body text-danger">{feil}</p>
      </CardShell>
    );
  }
  if (laster) {
    return <p className="py-6 text-center text-body text-fg-muted">Laster …</p>;
  }
  if (!rader || rader.length === 0) {
    return (
      <CardShell className="p-8 text-center">
        <p className="text-label text-fg">Ingen forhandlere</p>
        <p className="mt-1 text-[12px] text-fg-muted">Opprett en under Forhandlere først.</p>
      </CardShell>
    );
  }

  const nivaa = katalog.data?.nivaa ?? [];
  const tillegg = katalog.data?.tillegg ?? [];

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-xl border border-border">
        {rader.map((t, i) => {
          const plan = t.plan ?? 'start';
          const nivaaRad = nivaa.find((n) => n.key === plan);
          const included = tilleggNokler(
            t.modules
              .filter((m) => m.enabled && m.source !== 'optional' && m.source !== 'dealer')
              .map((m) => m.moduleKey),
            tillegg,
            nivaaRad,
          );
          const optional = tilleggNokler(
            t.modules
              .filter((m) => m.source === 'optional' || m.source === 'dealer')
              .map((m) => m.moduleKey),
            tillegg,
            nivaaRad,
          );
          const vis = apen === t.id;
          const pa = t.modules.filter((m) => m.enabled && m.source !== 'optional');
          return (
            <div
              key={t.id}
              className={`flex flex-col gap-2 bg-bg px-4 py-3 ${
                i > 0 ? 'border-border border-t' : ''
              }`}
            >
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-label text-fg">{t.name}</span>
                  <span className="truncate text-[12px] text-fg-muted">
                    {t.slug}
                    {t.kind === 'demo' ? ' · demo' : ''}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {t.erEndwise ? <Badge variant="secondary">Endwise</Badge> : null}
                  {pa.length === 0 && !t.erEndwise ? (
                    <span className="text-[12px] text-fg-muted">Ingen tillegg</span>
                  ) : (
                    pa.map((m) => (
                      <Badge key={m.moduleKey} variant="secondary">
                        {m.moduleKey}
                      </Badge>
                    ))
                  )}
                </div>
                {!t.erEndwise ? (
                  <button
                    type="button"
                    onClick={() => setApen(vis ? null : t.id)}
                    className="text-[12px] text-fg-muted underline-offset-2 hover:text-fg hover:underline"
                  >
                    {vis ? 'Lukk' : 'Endre pakke'}
                  </button>
                ) : null}
              </div>
              {vis && !t.erEndwise ? (
                <FlaggPakke
                  key={`${t.id}:${plan}:${included.join(',')}:${optional.join(',')}`}
                  plan={plan}
                  included={included}
                  optional={optional}
                  nivaa={nivaa}
                  tillegg={tillegg}
                  pending={sett.isPending}
                  onLagre={(tier, inc, opt) =>
                    sett.mutate({ tenantId: t.id, tier, included: inc, optional: opt })
                  }
                />
              ) : null}
            </div>
          );
        })}
      </div>
      {sett.isError ? <p className="text-body text-danger">{sett.error.message}</p> : null}
    </div>
  );
}

function FlaggPakke({
  plan,
  included,
  optional,
  nivaa,
  tillegg,
  pending,
  onLagre,
}: {
  plan: string;
  included: string[];
  optional: string[];
  nivaa: NonNullable<RouterOutput['tenants']['pakkeKatalog']>['nivaa'];
  tillegg: NonNullable<RouterOutput['tenants']['pakkeKatalog']>['tillegg'];
  pending: boolean;
  onLagre: (tier: 'start' | 'pro' | 'enterprise', included: string[], optional: string[]) => void;
}) {
  const [valgt, setValgt] = useState(plan);
  const [fast, setFast] = useState(() => new Set(included));
  const [valg, setValg] = useState(() => new Set(optional));
  const valgtNivaa = nivaa.find((n) => n.key === valgt);
  const synlige = tilleggForNivaa(valgtNivaa, tillegg);

  function byttNivaa(key: string) {
    const neste = nivaa.find((n) => n.key === key);
    const lovlige = new Set(tilleggForNivaa(neste, tillegg).map((t) => t.key));
    setValgt(key);
    setFast(new Set([...fast].filter((k) => lovlige.has(k))));
    setValg(new Set([...valg].filter((k) => lovlige.has(k))));
  }

  return (
    <div className="flex flex-col gap-3">
      <NivaaValg nivaa={nivaa} valgt={valgt} onChange={byttNivaa} />
      <TilleggListe
        tillegg={synlige}
        included={fast}
        optional={valg}
        onToggleIncluded={(key) => {
          const neste = new Set(fast);
          if (neste.has(key)) neste.delete(key);
          else neste.add(key);
          setFast(neste);
        }}
        onToggleOptional={(key) => {
          const neste = new Set(valg);
          if (neste.has(key)) neste.delete(key);
          else neste.add(key);
          setValg(neste);
        }}
      />
      <div className="flex justify-end">
        <StatefulButton
          type="button"
          disabled={pending}
          state={pending ? 'loading' : 'idle'}
          loadingText="Lagrer…"
          onClick={() =>
            onLagre(
              valgt as 'start' | 'pro' | 'enterprise',
              [...fast],
              [...valg].filter((k) => !fast.has(k)),
            )
          }
        >
          Lagre pakke
        </StatefulButton>
      </div>
    </div>
  );
}
