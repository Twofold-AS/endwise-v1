'use client';

import { CircleAlert, Plus } from '@endwise/ui';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { FELT, NIVA_VALG, nivaTekst } from '../../mekanikere/kompetanse/_niva';

export type ValgtKompetanse = {
  skillKey: string;
  level: number;
};

/**
 * Samme ferdighetskatalog og nivåord som Organisasjon › Kompetanse.
 * Ingen nye kompetansetyper — bare `competence.listSkills`.
 */
export function KompetanseVelger({
  valgte,
  onEndre,
}: {
  valgte: ValgtKompetanse[];
  onEndre: (neste: ValgtKompetanse[]) => void;
}) {
  const ferdigheter = trpc.competence.listSkills.useQuery();
  const [skillKey, setSkillKey] = useState('');
  const [level, setLevel] = useState(3);
  const [apen, setApen] = useState(false);

  if (ferdigheter.isLoading) {
    return <p className="text-[12px] text-fg-muted">Laster ferdigheter …</p>;
  }
  if (ferdigheter.isError) {
    return (
      <p className="flex items-start gap-2 text-[12px] text-danger">
        <CircleAlert size={14} className="mt-0.5 shrink-0" />
        {ferdigheter.error.message}
      </p>
    );
  }

  const ledige = (ferdigheter.data ?? []).filter((f) => !valgte.some((v) => v.skillKey === f.key));
  const katalog = new Map((ferdigheter.data ?? []).map((f) => [f.key, f]));

  return (
    <div className="flex flex-col gap-2">
      <p className="text-label text-fg">Kompetanse</p>
      <p className="text-[12px] text-fg-muted">
        Velges fra katalogen. Nivå og sertifisering er de samme som på Kompetanse-siden.
      </p>
      {valgte.length === 0 ? (
        <p className="text-[12px] text-fg-muted">Ingen ferdigheter valgt ennå.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {valgte.map((v) => (
            <li
              key={v.skillKey}
              className="flex items-center gap-2 rounded-control border border-border bg-bg px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-label text-fg">
                {katalog.get(v.skillKey)?.name ?? v.skillKey}
              </span>
              <span className="shrink-0 text-[12px] text-fg-muted">{nivaTekst(v.level)}</span>
              <button
                type="button"
                onClick={() => onEndre(valgte.filter((x) => x.skillKey !== v.skillKey))}
                className="shrink-0 text-[12px] text-fg-muted underline underline-offset-2 hover:text-destructive"
              >
                Fjern
              </button>
            </li>
          ))}
        </ul>
      )}
      {ledige.length === 0 ? (
        <p className="text-[12px] text-fg-muted">
          Alle ferdigheter i katalogen er allerede valgt, eller katalogen er tom.
        </p>
      ) : apen ? (
        <div className="flex flex-col gap-2 rounded-control border border-border px-3 py-3">
          <label className="flex flex-col gap-1">
            <span className="text-label text-fg">Ferdighet</span>
            <select
              value={skillKey || ledige[0]?.key}
              onChange={(e) => setSkillKey(e.target.value)}
              className={FELT}
            >
              {ledige.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-label text-fg">Nivå</span>
            <select
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              className={FELT}
            >
              {NIVA_VALG.map((v) => (
                <option key={v.niva} value={v.niva}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setApen(false)}
              className="h-control rounded-control px-3 text-label text-fg-muted"
            >
              Avbryt
            </button>
            <button
              type="button"
              onClick={() => {
                const key = skillKey || ledige[0]?.key;
                if (!key) return;
                onEndre([...valgte, { skillKey: key, level }]);
                setSkillKey('');
                setLevel(3);
                setApen(false);
              }}
              className="h-control rounded-control border border-border px-3 text-label text-fg"
            >
              Legg til
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setSkillKey(ledige[0]?.key ?? '');
            setApen(true);
          }}
          className="inline-flex h-control items-center gap-1.5 self-start rounded-control border border-border px-2.5 text-label text-fg hover:bg-surface-2"
        >
          <Plus size={14} strokeWidth={1.75} />
          Legg til ferdighet
        </button>
      )}
    </div>
  );
}
