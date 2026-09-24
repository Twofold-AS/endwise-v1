'use client';

import { ChevronLeft, ChevronRight } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  CLAUDE_ACT,
  CLAUDE_CARD,
  CLAUDE_CHIP,
  CLAUDE_PAGE_SUB,
  CLAUDE_PAGE_TITLE,
  CLAUDE_ROW_SUB,
  CLAUDE_ROW_TITLE,
  CLAUDE_SECTION,
  CLAUDE_TAG,
  NORSK_ALPHA,
  type NorskBokstav,
} from './claude-tokens';

/**
 * Claude-sidehode under eksisterende chrome (ikke ny toppbar).
 * pageTitle · pageSub · primærpille.
 */
export function ClaudePageHead({
  title,
  sub,
  primary,
  primaryHref,
  onPrimary,
}: {
  title: string;
  sub?: string;
  primary?: string;
  primaryHref?: string;
  onPrimary?: () => void;
}) {
  const knapp = primary ? (
    primaryHref ? (
      <Link
        href={primaryHref as Route}
        data-claude-primary
        className={`${CLAUDE_ACT} bg-fg text-bg`}
      >
        {primary}
      </Link>
    ) : (
      <button
        type="button"
        data-claude-primary
        onClick={onPrimary}
        className={`${CLAUDE_ACT} bg-fg text-bg`}
      >
        {primary}
      </button>
    )
  ) : null;

  return (
    <div data-claude-page-head className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 data-claude-page-title className={CLAUDE_PAGE_TITLE}>
          {title}
        </h1>
        {sub ? (
          <p data-claude-page-sub className={`mt-1 ${CLAUDE_PAGE_SUB}`}>
            {sub}
          </p>
        ) : null}
      </div>
      {knapp}
    </div>
  );
}

export function ClaudeSection({
  heading,
  children,
  actions,
}: {
  heading?: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section data-claude-section={heading ?? ''} className="flex flex-col gap-2">
      {heading ? <h2 className={CLAUDE_SECTION}>{heading}</h2> : null}
      {children}
      {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
    </section>
  );
}

export function ClaudeListRow({
  href,
  onClick,
  icon,
  title,
  sub,
  right,
  rightTone,
  onRemove,
}: {
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
  title: string;
  sub?: string;
  right?: string;
  rightTone?: 'muted' | 'ok' | 'warn';
  onRemove?: () => void;
}) {
  const tone =
    rightTone === 'ok' ? 'text-success' : rightTone === 'warn' ? 'text-danger' : 'text-fg-muted';
  const kropp = (
    <>
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span className="min-w-0 flex-1">
        <span className={`block truncate ${CLAUDE_ROW_TITLE}`}>{title}</span>
        {sub ? <span className={`mt-0.5 block truncate ${CLAUDE_ROW_SUB}`}>{sub}</span> : null}
      </span>
      {right ? (
        <span data-claude-right className={`shrink-0 text-[13px] font-[450] tabular-nums ${tone}`}>
          {right}
        </span>
      ) : null}
    </>
  );
  const radKlasse = `${CLAUDE_CARD} flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left [touch-action:manipulation]`;
  return (
    <div className="flex items-stretch gap-2">
      {href ? (
        <Link
          href={href as Route}
          data-claude-row={title}
          className={`${radKlasse} min-w-0 flex-1`}
        >
          {kropp}
        </Link>
      ) : onClick ? (
        <button
          type="button"
          data-claude-row={title}
          onClick={onClick}
          className={`${radKlasse} min-w-0 flex-1`}
        >
          {kropp}
        </button>
      ) : (
        <div data-claude-row={title} className={`${radKlasse} min-w-0 flex-1`}>
          {kropp}
        </div>
      )}
      {onRemove ? (
        <button
          type="button"
          aria-label={`Fjern ${title}`}
          onClick={onRemove}
          className="shrink-0 self-center text-[13px] text-fg-muted [touch-action:manipulation]"
        >
          Fjern
        </button>
      ) : null}
    </div>
  );
}

export function ClaudeInitialer({ navn }: { navn: string }) {
  const bokstaver = navn
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((d) => d[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span
      data-claude-initialer
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-field text-[13px] font-[650] text-fg"
    >
      {bokstaver || '?'}
    </span>
  );
}

export function ClaudeChip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      data-claude-chip={active ? '1' : '0'}
      aria-pressed={active}
      onClick={onClick}
      className={`${CLAUDE_CHIP} ${active ? 'bg-fg text-bg' : 'bg-field text-fg'}`}
    >
      {children}
    </button>
  );
}

export function ClaudeAct({
  kind = 'primary',
  children,
  href,
  onClick,
  disabled,
}: {
  kind?: 'primary' | 'ghost' | 'warn';
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const farge =
    kind === 'warn'
      ? 'bg-danger text-bg'
      : kind === 'ghost'
        ? 'border border-hairline bg-transparent text-fg'
        : 'bg-fg text-bg';
  const klasse = `${CLAUDE_ACT} ${farge} disabled:opacity-40`;
  if (href) {
    return (
      <Link href={href as Route} data-claude-act={kind} className={klasse}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      data-claude-act={kind}
      disabled={disabled}
      onClick={onClick}
      className={klasse}
    >
      {children}
    </button>
  );
}

export function ClaudeTag({
  children,
  tone = 'muted',
}: {
  children: ReactNode;
  tone?: 'muted' | 'ok' | 'warn' | 'info';
}) {
  const farge =
    tone === 'ok'
      ? 'bg-success/15 text-success'
      : tone === 'warn'
        ? 'bg-danger/10 text-danger'
        : tone === 'info'
          ? 'bg-surface-2 text-fg'
          : 'bg-field text-fg-muted';
  return (
    <span data-claude-tag className={`${CLAUDE_TAG} ${farge}`}>
      {children}
    </span>
  );
}

export function ClaudePager({
  label,
  harForrige,
  harNeste,
  onForrige,
  onNeste,
}: {
  label: string;
  harForrige: boolean;
  harNeste: boolean;
  onForrige: () => void;
  onNeste: () => void;
}) {
  return (
    <div data-claude-pager className="flex items-center gap-3">
      <p className="min-w-0 flex-1 text-[13px] text-fg-muted">{label}</p>
      <button
        type="button"
        aria-label="Forrige side"
        disabled={!harForrige}
        onClick={onForrige}
        className="inline-flex size-8 items-center justify-center rounded-full bg-field text-fg disabled:opacity-30"
      >
        <ChevronLeft size={16} strokeWidth={1.75} />
      </button>
      <button
        type="button"
        aria-label="Neste side"
        disabled={!harNeste}
        onClick={onNeste}
        className="inline-flex size-8 items-center justify-center rounded-full bg-field text-fg disabled:opacity-30"
      >
        <ChevronRight size={16} strokeWidth={1.75} />
      </button>
    </div>
  );
}

/**
 * Høyre alfabet-skinne — Claude CSS, ikke topp-rad.
 * position:absolute; top:0; right:4px; bottom:0; width:26px; column.
 */
export function ClaudeAlphaRail({
  aktiv,
  onVelg,
}: {
  aktiv: NorskBokstav;
  onVelg: (bokstav: NorskBokstav) => void;
}) {
  return (
    <nav
      data-claude-alpha-rail
      aria-label="Alfabet"
      className="absolute top-0 right-1 bottom-0 z-10 flex h-full w-[26px] flex-col items-center justify-center"
    >
      {NORSK_ALPHA.map((l) => {
        const on = l === aktiv;
        return (
          <button
            key={l}
            type="button"
            data-claude-alpha={l}
            data-active={on ? '1' : '0'}
            aria-pressed={on}
            onClick={() => onVelg(l)}
            className="flex h-[15px] w-5 items-center justify-center text-[11px] leading-none [touch-action:manipulation]"
            style={{
              fontWeight: on ? 700 : 500,
              color: on ? '#141414' : '#707070',
            }}
          >
            {l}
          </button>
        );
      })}
    </nav>
  );
}

export function ClaudeUndoToast({
  label,
  onAngre,
  onLukk,
}: {
  label: string;
  onAngre: () => void;
  onLukk?: () => void;
}) {
  return (
    <div data-claude-undo className={`${CLAUDE_CARD} flex items-center gap-3 px-4 py-3`}>
      <p className="min-w-0 flex-1 text-[14px] text-fg">{label}</p>
      <button
        type="button"
        data-claude-angre
        onClick={onAngre}
        className="shrink-0 text-[14px] font-[650] text-fg [touch-action:manipulation]"
      >
        Angre
      </button>
      {onLukk ? (
        <button type="button" onClick={onLukk} className="text-[13px] text-fg-muted">
          Lukk
        </button>
      ) : null}
    </div>
  );
}
