'use client';

import {
  AlertDialog,
  DeaktivertHandling,
  FeltSelect,
  LasterFlate,
  ListeRad,
  SelectItem,
} from '@endwise/ui';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { RouterOutput } from '@/lib/trpc';
import { trpc } from '@/lib/trpc';
import { FargeSvatser } from '../_avatar/farge-svatser';
import { useOrgRole } from '../_lib/use-org-role';
import { CardShell } from '../_shell/cards';
import { OpprettSkuff } from '../_shell/opprett-skuff';
import { KompetanseVelger, type ValgtKompetanse } from '../innstillinger/team/_kompetanse-velger';
import { nivaTekst } from '../mekanikere/kompetanse/_niva';
import { AktivitetMerke } from './_aktivitet';
import { ansattePageSub, erPaJobbNaa } from './_hub';
import { OpprettAnsattDialog } from './_opprett-dialog';

type Rad = RouterOutput['team']['list'][number];

const FUNKSJON_LABEL: Record<string, string> = {
  leder: 'Leder',
  selger: 'Selger',
  support: 'Support',
  mekaniker: 'Mekaniker',
};

const ROLLE_VALG = [
  { verdi: 'selger', label: 'Selger' },
  { verdi: 'support', label: 'Support' },
  { verdi: 'mekaniker', label: 'Mekaniker' },
] as const;

type JobFunksjon = 'leder' | 'selger' | 'support' | 'mekaniker';

function somJobFunksjon(verdi: string): JobFunksjon | null {
  if (verdi === 'leder' || verdi === 'selger' || verdi === 'support' || verdi === 'mekaniker') {
    return verdi;
  }
  return null;
}

export function OrganisasjonAnsatte({
  apenNy,
  onLukkNy,
}: {
  apenNy?: boolean;
  onLukkNy?: () => void;
} = {}) {
  const { isAdmin } = useOrgRole();
  const params = useSearchParams();
  const [opprettLokal, setOpprettLokal] = useState(params?.get('ny') === '1');
  const opprett = apenNy ?? opprettLokal;
  const lukkOpprett = onLukkNy ?? (() => setOpprettLokal(false));
  const apneOpprett = () => {
    if (onLukkNy) return;
    setOpprettLokal(true);
  };

  useEffect(() => {
    if (params?.get('ny') === '1') setOpprettLokal(true);
  }, [params]);
  const team = trpc.team.list.useQuery();
  const kompetanse = trpc.competence.listAllMechanicSkills.useQuery();
  const ferdigheter = trpc.competence.listSkills.useQuery();
  const katalog = new Map((ferdigheter.data ?? []).map((f) => [f.key, f.name]));

  if (team.isLoading) {
    return <LasterFlate linjer={3} label="Henter ansatte" />;
  }
  if (team.isError) {
    return <p className="text-body text-danger">{team.error.message}</p>;
  }

  const rader = team.data ?? [];
  const paJobb = rader.filter((r) => erPaJobbNaa(r.status)).length;

  return (
    <div className="flex flex-col gap-4">
      <p data-ansatte-pagesub className="text-body text-fg-muted">
        {ansattePageSub(rader.length, paJobb)}
      </p>
      {isAdmin && !onLukkNy ? (
        <button
          type="button"
          onClick={apneOpprett}
          className="inline-flex h-11 self-start items-center rounded-pill bg-fg px-4 text-label text-bg"
        >
          + Ny ansatt
        </button>
      ) : null}

      {rader.length === 0 ? (
        <CardShell className="p-8 text-center">
          <p className="text-label text-fg">Ingen ansatte ennå</p>
          <p className="mt-1 text-meta text-fg-muted">Opprett ansatt — med eller uten e-post.</p>
        </CardShell>
      ) : (
        <div>
          {rader.map((rad) => (
            <AnsattKort
              key={rad.userId}
              rad={rad}
              kanEndre={isAdmin}
              ferdigheter={(kompetanse.data ?? [])
                .filter((k) => k.mechanicId === rad.mechanicId)
                .map((k) => ({
                  skillKey: k.skillKey,
                  level: k.level,
                  navn: katalog.get(k.skillKey) ?? k.skillKey,
                }))}
            />
          ))}
        </div>
      )}

      {rader.some((r) => r.jobberIDag > 0) ? (
        <div data-ansatte-idag className="flex flex-col gap-2">
          <p className="text-label font-[650] text-fg">Har jobber i dag</p>
          {rader
            .filter((r) => r.jobberIDag > 0)
            .map((r) => (
              <ListeRad
                key={`idag-${r.userId}`}
                tittel={r.navn}
                undertekst={`${r.jobberIDag} ${r.jobberIDag === 1 ? 'jobb' : 'jobber'} · tidsrom —`}
                hoyre="Ingen vakt registrert"
                chevron={false}
              />
            ))}
        </div>
      ) : null}

      <OpprettAnsattDialog apen={opprett} onLukk={lukkOpprett} />
    </div>
  );
}

function AnsattKort({
  rad,
  kanEndre,
  ferdigheter,
}: {
  rad: Rad;
  kanEndre: boolean;
  ferdigheter: { skillKey: string; level: number; navn: string }[];
}) {
  const [rolleApen, setRolleApen] = useState(false);
  const [kompApen, setKompApen] = useState(false);
  const [apen, setApen] = useState(false);
  const rolle = FUNKSJON_LABEL[rad.funksjon] ?? rad.funksjon;

  return (
    <div>
      <ListeRad
        tittel={rad.navn}
        undertekst={rolle}
        initialer={rad.navn.slice(0, 2).toUpperCase()}
        hoyre={
          <span className="flex flex-col items-end gap-1">
            <AktivitetMerke status={rad.status} label={rad.statusLabel} />
            <span className="text-meta text-fg-muted">Ingen vakt registrert</span>
          </span>
        }
        onClick={() => setApen((v) => !v)}
        chevron
      />
      {apen ? (
        <div className="flex flex-col gap-3 border-border border-b pb-4">
          <p className="text-meta text-fg-muted">
            {rad.jobberIDag} jobber i dag · tidsrom —
            {ferdigheter.length > 0
              ? ` · ${ferdigheter.map((f) => `${f.navn} (${nivaTekst(f.level)})`).join(', ')}`
              : ''}
          </p>
          <DeaktivertHandling forklaring="Kommer senere">Registrer vakt/fravær</DeaktivertHandling>
          {kanEndre ? (
            <FargeSvatser userId={rad.userId} valgt={rad.farge ?? rad.avatar?.farge} />
          ) : null}
          <div className="flex flex-wrap gap-2">
            {kanEndre && rad.kanEndres ? (
              <button
                type="button"
                onClick={() => setRolleApen(true)}
                className="inline-flex h-11 items-center rounded-pill border border-border px-3 text-label text-fg"
              >
                Endre rolle
              </button>
            ) : null}
            {kanEndre ? (
              <button
                type="button"
                onClick={() => setKompApen(true)}
                className="inline-flex h-11 items-center rounded-pill border border-border px-3 text-label text-fg"
              >
                Kompetanse
              </button>
            ) : null}
          </div>
          <div data-ansatt-tjenestetid>
            <DeaktivertHandling forklaring="Kommer senere">Sett tid</DeaktivertHandling>
          </div>
          {kanEndre && rad.kanEndres ? <SlettAnsatt rad={rad} /> : null}
        </div>
      ) : null}
      <RolleDialog rad={rad} apen={rolleApen} onLukk={() => setRolleApen(false)} />
      <KompetanseDialog rad={rad} apen={kompApen} onLukk={() => setKompApen(false)} />
    </div>
  );
}

function SlettAnsatt({ rad }: { rad: Rad }) {
  const utils = trpc.useUtils();
  const [apen, setApen] = useState(false);
  const fjern = trpc.team.fjern.useMutation({
    onSuccess: () => {
      setApen(false);
      void utils.team.list.invalidate();
      void utils.mechanics.list.invalidate();
      void utils.mechanics.oversikt.invalidate();
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setApen(true)}
        className="inline-flex h-control items-center self-start rounded-control border border-border px-2.5 text-label text-fg-muted hover:text-danger"
      >
        Slett ansatt
      </button>
      <AlertDialog
        isOpen={apen}
        onOpenChange={setApen}
        title={`Fjerne ${rad.navn} fra teamet?`}
        description="Personen deaktiveres og forsvinner fra teamet. Kontoen slettes ikke."
        confirmLabel="Bekreft"
        cancelLabel="Avbryt"
        pendingLabel="Fjerner …"
        onConfirm={() => fjern.mutateAsync({ userId: rad.userId })}
      />
    </div>
  );
}

function RolleDialog({ rad, apen, onLukk }: { rad: Rad; apen: boolean; onLukk: () => void }) {
  const utils = trpc.useUtils();
  const [funksjon, setFunksjon] = useState<JobFunksjon>(rad.funksjon);
  const sett = trpc.team.setFunction.useMutation({
    onSuccess: () => {
      void utils.team.list.invalidate();
      void utils.mechanics.list.invalidate();
      void utils.mechanics.oversikt.invalidate();
      onLukk();
    },
  });

  return (
    <OpprettSkuff tittel="Rolle" apen={apen} onLukk={onLukk} tvingSkuff>
      <FeltSelect
        label="Rolle"
        selectedKey={funksjon}
        onSelectionChange={(key) => {
          const neste = somJobFunksjon(String(key ?? ''));
          if (neste) setFunksjon(neste);
        }}
      >
        {ROLLE_VALG.map((r) => (
          <SelectItem key={r.verdi} id={r.verdi}>
            {r.label}
          </SelectItem>
        ))}
      </FeltSelect>
      {sett.isError ? <p className="mt-2 text-body text-danger">{sett.error.message}</p> : null}
      <button
        type="button"
        disabled={sett.isPending || funksjon === rad.funksjon}
        onClick={() =>
          sett.mutate({
            userId: rad.userId,
            funksjon: funksjon as (typeof ROLLE_VALG)[number]['verdi'],
          })
        }
        className="inline-flex h-12 items-center justify-center rounded-pill bg-fg px-4 text-body text-bg disabled:opacity-40"
      >
        {sett.isPending ? 'Lagrer …' : 'Lagre'}
      </button>
    </OpprettSkuff>
  );
}

function KompetanseDialog({ rad, apen, onLukk }: { rad: Rad; apen: boolean; onLukk: () => void }) {
  const utils = trpc.useUtils();
  const [valgte, setValgte] = useState<ValgtKompetanse[]>([]);
  const sett = trpc.competence.setMechanicSkill.useMutation();

  async function lagre() {
    if (!rad.mechanicId) return;
    for (const k of valgte) {
      await sett.mutateAsync({ mechanicId: rad.mechanicId, skillKey: k.skillKey, level: k.level });
    }
    void utils.competence.listAllMechanicSkills.invalidate();
    setValgte([]);
    onLukk();
  }

  return (
    <OpprettSkuff tittel="Kompetanse" apen={apen} onLukk={onLukk} tvingSkuff>
      {rad.mechanicId ? (
        <>
          <KompetanseVelger valgte={valgte} onEndre={setValgte} />
          <button
            type="button"
            disabled={sett.isPending || valgte.length === 0}
            onClick={() => void lagre()}
            className="inline-flex h-12 items-center justify-center rounded-pill bg-fg px-4 text-body text-bg disabled:opacity-40"
          >
            {sett.isPending ? 'Lagrer …' : 'Lagre'}
          </button>
        </>
      ) : (
        <p className="text-body text-fg-muted">
          Kompetanse tildeles mekanikere. Gi hen rollen mekaniker først.
        </p>
      )}
    </OpprettSkuff>
  );
}
