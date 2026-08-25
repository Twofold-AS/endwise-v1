'use client';

import { Avatar, ChevronDown, CircleAlert, Plus, StatefulButton } from '@endwise/ui';
import { useState } from 'react';
import type { RouterOutput } from '@/lib/trpc';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../../_shell/cards';
import { FELT, NIVA_VALG, nivaTekst, sertStatus } from './_niva';

type Mekaniker = RouterOutput['mechanics']['oversikt'][number];
type Ferdighet = RouterOutput['competence']['listSkills'][number];
type Kompetanse = RouterOutput['competence']['listAllMechanicSkills'][number];

const STATUS_PRIKK: Record<string, string> = {
  ledig: 'bg-success',
  på_jobb: 'bg-warn',
  opptatt: 'bg-warn',
  fri: 'bg-fg-muted',
};

/**
 * F3-12 / F3-08 — kompetanse per mekaniker. Samme felter mekanikeren leser
 * under Kompetanse: ferdighet, nivå, sert. t.o.m.
 */
export function MekanikerKompetanse({
  mekaniker,
  ferdigheter,
  rader,
  kanEndre,
}: {
  mekaniker: Mekaniker;
  ferdigheter: Ferdighet[];
  rader: Kompetanse[];
  kanEndre: boolean;
}) {
  const [apen, setApen] = useState(false);
  const katalog = new Map(ferdigheter.map((f) => [f.key, f]));

  return (
    <CardShell>
      <button
        type="button"
        onClick={() => setApen((v) => !v)}
        aria-expanded={apen}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2"
      >
        <Avatar
          seed={mekaniker.id}
          valg={{ ...mekaniker.avatar, humor: mekaniker.statusHumor }}
          navn={mekaniker.name}
          size={32}
          bevegelse="stille"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-label text-fg">{mekaniker.name}</p>
          <p className="flex items-center gap-1.5 text-[12px] text-fg-muted">
            <span
              aria-hidden
              className={`inline-block size-2 rounded-full ${STATUS_PRIKK[mekaniker.status] ?? 'bg-fg-muted'}`}
            />
            {mekaniker.statusLabel}
          </p>
        </div>
        <div className="hidden min-w-0 flex-1 flex-wrap justify-end gap-1 sm:flex">
          {rader.length === 0 ? (
            <span className="text-[12px] text-fg-muted">Ingen ferdigheter</span>
          ) : (
            rader.map((r) => (
              <span
                key={r.skillKey}
                className="inline-flex h-badge items-center rounded-badge bg-surface-2 px-1.5 text-[11px] text-fg-muted"
              >
                {katalog.get(r.skillKey)?.name ?? r.skillKey}
              </span>
            ))
          )}
        </div>
        <ChevronDown
          size={16}
          className={`shrink-0 text-fg-muted transition-transform ${apen ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {apen && (
        <div className="flex flex-col gap-3 border-border border-t px-4 py-4">
          {rader.length === 0 && (
            <p className="text-[12px] text-fg-muted">Ingen registrerte ferdigheter.</p>
          )}
          {rader.map((rad) => (
            <KompetanseRad
              key={rad.skillKey}
              mekanikerId={mekaniker.id}
              rad={rad}
              navn={katalog.get(rad.skillKey)?.name ?? rad.skillKey}
              kreverSert={katalog.get(rad.skillKey)?.requiresCertification ?? false}
              kanEndre={kanEndre}
            />
          ))}
          {kanEndre && (
            <NyKompetanse
              mekanikerId={mekaniker.id}
              ferdigheter={ferdigheter.filter((f) => !rader.some((r) => r.skillKey === f.key))}
            />
          )}
        </div>
      )}
    </CardShell>
  );
}

function KompetanseRad({
  mekanikerId,
  rad,
  navn,
  kreverSert,
  kanEndre,
}: {
  mekanikerId: string;
  rad: Kompetanse;
  navn: string;
  kreverSert: boolean;
  kanEndre: boolean;
}) {
  const [redigerer, setRedigerer] = useState(false);
  const sert = sertStatus(rad.certificationExpiresAt);

  return (
    <div className="rounded-lg border border-border bg-inset px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-label text-fg">{navn}</span>
        <span className="text-[12px] text-fg-muted">{nivaTekst(rad.level)}</span>
        {sert && <span className={`text-[12px] ${sert.tone}`}>{sert.tekst}</span>}
        {kanEndre && !redigerer && (
          <button
            type="button"
            onClick={() => setRedigerer(true)}
            className="h-7 rounded-control border border-border px-2 text-label text-fg hover:bg-surface-2"
          >
            Rediger
          </button>
        )}
      </div>
      {redigerer && (
        <KompetanseSkjema
          mekanikerId={mekanikerId}
          skillKey={rad.skillKey}
          start={{
            level: rad.level,
            certifiedAt: rad.certifiedAt ?? '',
            certificationExpiresAt: rad.certificationExpiresAt ?? '',
            yearsExperience: rad.yearsExperience != null ? String(rad.yearsExperience) : '',
            notes: rad.notes ?? '',
          }}
          kreverSert={kreverSert}
          kanFjerne
          onFerdig={() => setRedigerer(false)}
        />
      )}
    </div>
  );
}

function NyKompetanse({
  mekanikerId,
  ferdigheter,
}: {
  mekanikerId: string;
  ferdigheter: Ferdighet[];
}) {
  const [apen, setApen] = useState(false);
  const [skillKey, setSkillKey] = useState(ferdigheter[0]?.key ?? '');

  if (ferdigheter.length === 0) {
    return (
      <p className="text-[12px] text-fg-muted">
        Alle ferdigheter i katalogen er allerede registrert på denne mekanikeren.
      </p>
    );
  }

  if (!apen) {
    return (
      <button
        type="button"
        onClick={() => setApen(true)}
        className="inline-flex h-control items-center gap-1.5 self-start rounded-control border border-border px-2.5 text-label text-fg hover:bg-surface-2"
      >
        <Plus size={14} strokeWidth={1.75} />
        Legg til ferdighet
      </button>
    );
  }

  const valgt = ferdigheter.find((f) => f.key === skillKey) ?? ferdigheter[0];

  return (
    <div className="rounded-lg border border-border px-3 py-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-label text-fg">Ferdighet</span>
        <select
          value={skillKey || valgt.key}
          onChange={(e) => setSkillKey(e.target.value)}
          className={FELT}
        >
          {ferdigheter.map((f) => (
            <option key={f.key} value={f.key}>
              {f.name}
            </option>
          ))}
        </select>
      </label>
      <KompetanseSkjema
        mekanikerId={mekanikerId}
        skillKey={skillKey || valgt.key}
        start={{
          level: 3,
          certifiedAt: '',
          certificationExpiresAt: '',
          yearsExperience: '',
          notes: '',
        }}
        kreverSert={valgt.requiresCertification}
        onFerdig={() => setApen(false)}
      />
    </div>
  );
}

function KompetanseSkjema({
  mekanikerId,
  skillKey,
  start,
  kreverSert,
  kanFjerne,
  onFerdig,
}: {
  mekanikerId: string;
  skillKey: string;
  start: {
    level: number;
    certifiedAt: string;
    certificationExpiresAt: string;
    yearsExperience: string;
    notes: string;
  };
  kreverSert: boolean;
  kanFjerne?: boolean;
  onFerdig: () => void;
}) {
  const utils = trpc.useUtils();
  const [level, setLevel] = useState(start.level);
  const [certifiedAt, setCertifiedAt] = useState(isoDato(start.certifiedAt));
  const [expiresAt, setExpiresAt] = useState(isoDato(start.certificationExpiresAt));
  const [years, setYears] = useState(start.yearsExperience);
  const [notes, setNotes] = useState(start.notes);

  const etter = () => {
    void utils.competence.listAllMechanicSkills.invalidate();
    void utils.competence.listMechanicSkills.invalidate();
    void utils.competence.expiringCertifications.invalidate();
  };

  const lagre = trpc.competence.setMechanicSkill.useMutation({
    onSuccess: () => {
      etter();
      onFerdig();
    },
  });
  const fjern = trpc.competence.removeMechanicSkill.useMutation({
    onSuccess: () => {
      etter();
      onFerdig();
    },
  });

  return (
    <form
      className="mt-3 flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const yearsExperience = years.trim() === '' ? undefined : Number(years);
        lagre.mutate({
          mechanicId: mekanikerId,
          skillKey,
          level,
          certifiedAt: certifiedAt || undefined,
          certificationExpiresAt: expiresAt || undefined,
          yearsExperience:
            yearsExperience != null && Number.isFinite(yearsExperience)
              ? yearsExperience
              : undefined,
          notes: notes.trim() || undefined,
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-label text-fg">Nivå</span>
          <select value={level} onChange={(e) => setLevel(Number(e.target.value))} className={FELT}>
            {NIVA_VALG.map((v) => (
              <option key={v.niva} value={v.niva}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-label text-fg">Erfaring (år)</span>
          <input
            inputMode="numeric"
            value={years}
            onChange={(e) => setYears(e.target.value)}
            className={FELT}
            placeholder="Valgfritt"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-label text-fg">Sertifisert</span>
          <input
            type="date"
            value={certifiedAt}
            onChange={(e) => setCertifiedAt(e.target.value)}
            className={FELT}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-label text-fg">
            Sert. t.o.m.{kreverSert ? ' (påkrevd for matching)' : ''}
          </span>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className={FELT}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-label text-fg">Notat</span>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={FELT}
          placeholder="Valgfritt"
        />
      </label>
      {(lagre.isError || fjern.isError) && (
        <p className="flex items-start gap-2 text-body text-danger">
          <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          {lagre.error?.message ?? fjern.error?.message}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {kanFjerne && (
          <button
            type="button"
            onClick={() => fjern.mutate({ mechanicId: mekanikerId, skillKey })}
            disabled={fjern.isPending}
            className="mr-auto h-control rounded-control border border-border px-2.5 text-label text-fg-muted hover:text-danger disabled:opacity-50"
          >
            {fjern.isPending ? 'Fjerner…' : 'Fjern'}
          </button>
        )}
        <button
          type="button"
          onClick={onFerdig}
          className="h-control rounded-control px-3 text-label text-fg-muted hover:text-fg"
        >
          Avbryt
        </button>
        <StatefulButton
          type="submit"
          disabled={lagre.isPending}
          state={
            lagre.isPending
              ? 'loading'
              : lagre.isSuccess
                ? 'success'
                : lagre.isError
                  ? 'error'
                  : 'idle'
          }
          loadingText="Lagrer…"
          successText="Lagret"
          errorText="Feilet"
        >
          Lagre
        </StatefulButton>
      </div>
    </form>
  );
}

function isoDato(verdi: string): string {
  if (!verdi) return '';
  return verdi.slice(0, 10);
}
