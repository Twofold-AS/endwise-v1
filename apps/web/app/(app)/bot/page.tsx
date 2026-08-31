'use client';

import { Switch } from '@endwise/ui';
import { useState } from 'react';
import { BotFigur } from './_figur';
import {
  BOT_HOVED,
  BOT_STORRELSER,
  BOT_TILSTANDER,
  BOT_UTTRYKK,
  type BotHoved,
  type BotTilstand,
  type BotUttrykk,
  DEFAULT_EXPRESSION,
  FELT,
} from './_katalog';

/**
 * Intern gjennomgang av maskoten. Tittelen sitter i top-baren («Bot»).
 * Motoren er bloub. Form er låst til cercle.
 */
export default function BotPage() {
  const [tilstand, setTilstand] = useState<BotTilstand>('idle');
  const [uttrykk, setUttrykk] = useState<BotUttrykk>(DEFAULT_EXPRESSION);
  const [hoved, setHoved] = useState<BotHoved>('idle');
  const [folgPeker, setFolgPeker] = useState(true);
  const [spiller, setSpiller] = useState(false);
  const [storrelse, setStorrelse] = useState<(typeof BOT_STORRELSER)[number]>(280);

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-8 px-4 py-8">
      <BotFigur
        tilstand={tilstand}
        uttrykk={uttrykk}
        storrelse={storrelse}
        folgPeker={folgPeker}
        spiller={spiller}
        onTilstand={setTilstand}
      />

      <div className="flex w-full max-w-[520px] flex-col gap-4">
        <div role="tablist" aria-label="Uttrykk" className="flex flex-wrap justify-center gap-1.5">
          {BOT_HOVED.map((h) => (
            <button
              key={h.oye}
              type="button"
              role="tab"
              aria-selected={hoved === h.oye}
              onClick={() => {
                setSpiller(false);
                setHoved(h.oye);
                setTilstand(h.tilstand);
                setUttrykk(h.uttrykk);
              }}
              className={`inline-flex h-control items-center rounded-pill px-3 text-label transition-colors ${
                hoved === h.oye ? 'bg-fg text-bg' : 'bg-surface-2 text-fg-muted hover:text-fg'
              }`}
            >
              {h.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-label text-fg-muted">Tilstand</span>
            <select
              className={FELT}
              value={tilstand}
              onChange={(e) => {
                setSpiller(false);
                setTilstand(e.target.value as BotTilstand);
                setHoved(
                  BOT_HOVED.find(
                    (h) =>
                      h.tilstand === e.target.value && h.oye !== 'laster' && h.oye !== 'lytter',
                  )?.oye ?? 'idle',
                );
              }}
            >
              {BOT_TILSTANDER.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-label text-fg-muted">Uttrykk</span>
            <select
              className={FELT}
              value={uttrykk}
              onChange={(e) => setUttrykk(e.target.value as BotUttrykk)}
            >
              {BOT_UTTRYKK.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-label text-fg">Følg peker</span>
              <Switch checked={folgPeker} onCheckedChange={setFolgPeker} aria-label="Følg peker" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-label text-fg">Spill syklus</span>
              <Switch checked={spiller} onCheckedChange={setSpiller} aria-label="Spill syklus" />
            </div>
          </div>
          <fieldset aria-label="Størrelse" className="flex items-center gap-1.5 border-0 p-0">
            {BOT_STORRELSER.map((px) => (
              <button
                key={px}
                type="button"
                aria-pressed={storrelse === px}
                onClick={() => setStorrelse(px)}
                className={`inline-flex h-control items-center rounded-pill px-3 text-label transition-colors ${
                  storrelse === px ? 'bg-fg text-bg' : 'bg-surface-2 text-fg-muted hover:text-fg'
                }`}
              >
                {px}
              </button>
            ))}
          </fieldset>
        </div>
      </div>
    </div>
  );
}
