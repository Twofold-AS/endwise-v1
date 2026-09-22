'use client';

import type { ReactNode } from 'react';

/** Delte Claude-feltmønstre: text · area · chips. */
export function SkjemaTekst({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="flex w-full flex-col gap-1">
      <span className="text-[12px] text-fg-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="ew-felt ew-felt-md"
      />
      {hint ? <span className="text-[11px] text-fg-muted">{hint}</span> : null}
    </label>
  );
}

export function SkjemaOmrade({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex w-full flex-col gap-1">
      <span className="text-[12px] text-fg-muted">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="ew-felt ew-felt-md min-h-[4.5rem] resize-none py-2"
      />
    </label>
  );
}

export function SkjemaChips({
  label,
  options,
  value,
  onChange,
  hint,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5 border-0 p-0">
      <legend className="text-[12px] text-fg-muted">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={value === o}
            onClick={() => onChange(o)}
            className={`rounded-full px-3 py-1 text-[12px] ${
              value === o ? 'bg-fg text-bg' : 'bg-surface-2 text-fg-muted'
            }`}
          >
            {o}
          </button>
        ))}
      </div>
      {hint ? <span className="text-[11px] text-fg-muted">{hint}</span> : null}
    </fieldset>
  );
}

export function SkjemaGruppe({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3">{children}</div>;
}
