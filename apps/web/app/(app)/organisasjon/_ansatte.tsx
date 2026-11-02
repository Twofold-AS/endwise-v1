'use client';

import {
  AlertDialog,
  Avatar,
  DeaktivertHandling,
  FeltSelect,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Plus,
  SelectItem,
} from '@endwise/ui';
import { useState } from 'react';
import type { RouterOutput } from '@/lib/trpc';
import { trpc } from '@/lib/trpc';
import { FargeSvatser } from '../_avatar/farge-svatser';
import { useOrgRole } from '../_lib/use-org-role';
import { CardShell } from '../_shell/cards';
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

export function OrganisasjonAnsatte() {
  const { isAdmin } = useOrgRole();
  const [opprett, setOpprett] = useState(false);
  const team = trpc.team.list.useQuery();
  const kompetanse = trpc.competence.listAllMechanicSkills.useQuery();
  const ferdigheter = trpc.competence.listSkills.useQuery();
  const katalog = new Map((ferdigheter.data ?? []).map((f) => [f.key, f.name]));

  if (team.isLoading) {
    return <p className="px-1 py-6 text-body text-fg-muted">Laster ansatte …</p>;
  }
  if (team.isError) {
    return <p className="text-body text-danger">{team.error.message}</p>;
  }

  const rader = team.data ?? [];
  const paJobb = rader.filter((r) => erPaJobbNaa(r.status)).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-title text-fg">Ansatte</h2>
          <p data-ansatte-pagesub className="text-body text-fg-muted">
            {ansattePageSub(rader.length, paJobb)}
          </p>
        </div>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => setOpprett(true)}
            className="inline-flex h-control items-center rounded-control bg-fg px-3 text-label text-bg"
          >
            Opprett ansatt
          </button>
        ) : null}
      </div>

      {rader.length === 0 ? (
        <CardShell className="p-8 text-center">
          <p className="text-label text-fg">Ingen ansatte ennå</p>
          <p className="mt-1 text-[12px] text-fg-muted">Opprett ansatt — med eller uten e-post.</p>
        </CardShell>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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

      <OpprettAnsattDialog apen={opprett} onLukk={() => setOpprett(false)} />
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
  const start =
    rad.ansattSiden != null
      ? new Date(rad.ansattSiden).toLocaleString('nb-NO', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '—';

  return (
    <CardShell className="flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        <Avatar
          seed={rad.userId}
          valg={{ ...rad.avatar, humor: rad.statusHumor ?? rad.avatar.humor }}
          navn={rad.navn}
          size={32}
          bevegelse="stille"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-label text-fg">{rad.navn}</p>
          <div className="mt-1">
            <AktivitetMerke status={rad.status} label={rad.statusLabel} />
          </div>
        </div>
      </div>

      <p className="text-label text-fg-muted">
        Ansatt siden <span className="text-fg">{start}</span>
      </p>
      <p className="text-label text-fg-muted">
        Jobber <span className="text-fg">{rad.jobberIDag}</span>
      </p>

      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-label text-fg-muted">
          Rolle <span className="text-fg">{FUNKSJON_LABEL[rad.funksjon] ?? rad.funksjon}</span>
        </span>
        {kanEndre && rad.kanEndres ? (
          <button
            type="button"
            onClick={() => setRolleApen(true)}
            aria-label="Endre rolle"
            className="flex size-control shrink-0 items-center justify-center rounded-control text-fg hover:bg-surface-2"
          >
            <Plus size={16} strokeWidth={1.75} />
          </button>
        ) : null}
      </div>

      {kanEndre ? (
        <FargeSvatser userId={rad.userId} valgt={rad.farge ?? rad.avatar?.farge} />
      ) : null}

      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-label text-fg-muted">
          Kompetanse{' '}
          <span className="text-fg">
            {ferdigheter.length === 0
              ? '—'
              : ferdigheter.map((f) => `${f.navn} (${nivaTekst(f.level)})`).join(', ')}
          </span>
        </span>
        {kanEndre ? (
          <button
            type="button"
            onClick={() => setKompApen(true)}
            aria-label="Legg til kompetanse"
            className="flex size-control shrink-0 items-center justify-center rounded-control text-fg hover:bg-surface-2"
          >
            <Plus size={16} strokeWidth={1.75} />
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-2" data-ansatt-tjenestetid>
        <span className="text-label text-fg-muted">Egne tjenestetider</span>
        <DeaktivertHandling forklaring="Kommer senere">Sett tid</DeaktivertHandling>
      </div>

      {kanEndre && rad.kanEndres ? <SlettAnsatt rad={rad} /> : null}

      <RolleDialog rad={rad} apen={rolleApen} onLukk={() => setRolleApen(false)} />
      <KompetanseDialog rad={rad} apen={kompApen} onLukk={() => setKompApen(false)} />
    </CardShell>
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
    <Modal isOpen={apen} onOpenChange={(o) => !o && onLukk()} size="sm">
      {({ close }) => (
        <>
          <ModalHeader title="Rolle" />
          <ModalBody>
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
            {sett.isError ? (
              <p className="mt-2 text-[12px] text-danger">{sett.error.message}</p>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <button
              type="button"
              onClick={close}
              className="h-control px-3 text-label text-fg-muted"
            >
              Avbryt
            </button>
            <button
              type="button"
              disabled={sett.isPending || funksjon === rad.funksjon}
              onClick={() =>
                sett.mutate({
                  userId: rad.userId,
                  funksjon: funksjon as (typeof ROLLE_VALG)[number]['verdi'],
                })
              }
              className="h-control rounded-control border border-border px-3 text-label text-fg disabled:opacity-40"
            >
              {sett.isPending ? 'Lagrer …' : 'Lagre'}
            </button>
          </ModalFooter>
        </>
      )}
    </Modal>
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
    <Modal isOpen={apen} onOpenChange={(o) => !o && onLukk()} size="sm">
      {({ close }) => (
        <>
          <ModalHeader title="Kompetanse" />
          <ModalBody>
            {rad.mechanicId ? (
              <KompetanseVelger valgte={valgte} onEndre={setValgte} />
            ) : (
              <p className="text-body text-fg-muted">
                Kompetanse tildeles mekanikere. Gi hen rollen mekaniker først.
              </p>
            )}
          </ModalBody>
          {rad.mechanicId ? (
            <ModalFooter>
              <button
                type="button"
                onClick={close}
                className="h-control px-3 text-label text-fg-muted"
              >
                Avbryt
              </button>
              <button
                type="button"
                disabled={sett.isPending || valgte.length === 0}
                onClick={() => void lagre()}
                className="h-control rounded-control border border-border px-3 text-label text-fg disabled:opacity-40"
              >
                {sett.isPending ? 'Lagrer …' : 'Lagre'}
              </button>
            </ModalFooter>
          ) : null}
        </>
      )}
    </Modal>
  );
}
