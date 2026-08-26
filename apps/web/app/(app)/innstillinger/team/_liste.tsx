'use client';

import { Avatar, CircleAlert } from '@endwise/ui';
import type { RouterOutput } from '@/lib/trpc';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../../_shell/cards';
import type { TeamFaneId } from './_faner';

type Rad = RouterOutput['team']['list'][number];

const FUNKSJON_LABEL: Record<string, string> = {
  leder: 'Leder',
  selger: 'Selger',
  support: 'Support',
  mekaniker: 'Mekaniker',
};

export function passerFane(funksjon: string, fane: TeamFaneId): boolean {
  if (fane === 'alle') return true;
  if (fane === 'mekanikere') return funksjon === 'mekaniker';
  if (fane === 'selgere') return funksjon === 'selger';
  if (fane === 'support') return funksjon === 'support';
  return true;
}

const TOM: Record<TeamFaneId, { tittel: string; hint: string }> = {
  alle: { tittel: 'Ingen ansatte ennå', hint: 'Inviter noen øverst — med eller uten e-post.' },
  mekanikere: {
    tittel: 'Ingen mekanikere ennå',
    hint: 'Inviter en mekaniker, eller tildel jobbfunksjonen i detaljene.',
  },
  selgere: {
    tittel: 'Ingen selgere ennå',
    hint: 'Ingen i teamet har jobbfunksjonen selger.',
  },
  support: {
    tittel: 'Ingen i support ennå',
    hint: 'Ingen i teamet har jobbfunksjonen support.',
  },
};

export function TeamListe({
  fane,
  valgtId,
  onVelg,
}: {
  fane: TeamFaneId;
  valgtId: string | null;
  onVelg: (userId: string) => void;
}) {
  const team = trpc.team.list.useQuery();

  if (team.isLoading) {
    return <p className="px-1 py-6 text-body text-fg-muted">Laster team …</p>;
  }
  if (team.isError) {
    return (
      <CardShell className="flex items-start gap-3 p-4">
        <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-danger" />
        <p className="text-body text-danger">{team.error.message}</p>
      </CardShell>
    );
  }

  const rader = (team.data ?? []).filter((r) => passerFane(r.funksjon, fane));
  const tom = TOM[fane];

  if (rader.length === 0) {
    return (
      <CardShell className="p-8 text-center">
        <p className="text-label text-fg">{tom.tittel}</p>
        <p className="mt-1 text-[12px] text-fg-muted">{tom.hint}</p>
      </CardShell>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      {rader.map((r, i) => (
        <TeamRad
          key={r.userId}
          rad={r}
          valgt={r.userId === valgtId}
          strek={i > 0}
          onVelg={() => onVelg(r.userId)}
        />
      ))}
    </div>
  );
}

function TeamRad({
  rad,
  valgt,
  strek,
  onVelg,
}: {
  rad: Rad;
  valgt: boolean;
  strek: boolean;
  onVelg: () => void;
}) {
  return (
    <div
      className={`flex min-h-row-store items-center gap-3 bg-bg px-4 py-2 ${
        strek ? 'border-border border-t' : ''
      } ${valgt ? 'bg-sidebar-active/40' : ''}`}
    >
      <Avatar
        seed={rad.userId}
        valg={{ ...rad.avatar, humor: rad.statusHumor ?? rad.avatar.humor }}
        navn={rad.navn}
        size={32}
        bevegelse="stille"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-label text-fg">{rad.navn}</span>
        <span className="truncate text-[12px] text-fg-muted">
          {FUNKSJON_LABEL[rad.funksjon] ?? rad.funksjon}
        </span>
      </div>
      <button
        type="button"
        onClick={onVelg}
        aria-pressed={valgt}
        className="inline-flex h-control items-center rounded-control border border-border px-2.5 text-label text-fg hover:bg-surface-2"
      >
        Detaljer
      </button>
    </div>
  );
}
