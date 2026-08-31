'use client';

import { Switch } from '@endwise/ui';
import { useCallback, useState } from 'react';
import { BotFigur, type MorphBotEl, spillMorph } from './_figur';
import {
  BOT_HOVED,
  BOT_MORPHS,
  BOT_STORRELSER,
  BOT_TILSTANDER,
  type BotTilstand,
  FELT,
} from './_katalog';

/**
 * Intern gjennomgang av maskoten. Tittelen sitter i top-baren («Bot»).
 * Kroppen er Endwise-blob. De seks primærchipene er de låste øye-settene.
 */
export default function BotPage() {
  const [tilstand, setTilstand] = useState<BotTilstand>('idle');
  const [folgPeker, setFolgPeker] = useState(true);
  const [storrelse, setStorrelse] = useState<(typeof BOT_STORRELSER)[number]>(280);
  const [bot, setBot] = useState<MorphBotEl | null>(null);
  const onReady = useCallback((el: MorphBotEl | null) => {
    setBot(el);
  }, []);

  const hovedAktiv = BOT_HOVED.find((h) => h.tilstand === tilstand)?.oye ?? null;

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-8 px-4 py-8">
      <BotFigur tilstand={tilstand} storrelse={storrelse} folgPeker={folgPeker} onReady={onReady} />

      <div className="flex w-full max-w-[520px] flex-col gap-4">
        <div role="tablist" aria-label="Uttrykk" className="flex flex-wrap justify-center gap-1.5">
          {BOT_HOVED.map((h) => (
            <button
              key={h.oye}
              type="button"
              role="tab"
              aria-selected={hovedAktiv === h.oye}
              onClick={() => setTilstand(h.tilstand)}
              className={`inline-flex h-control items-center rounded-pill px-3 text-label transition-colors ${
                hovedAktiv === h.oye ? 'bg-fg text-bg' : 'bg-surface-2 text-fg-muted hover:text-fg'
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
              onChange={(e) => setTilstand(e.target.value as BotTilstand)}
            >
              {BOT_TILSTANDER.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-label text-fg-muted">Morph</span>
            <select
              className={FELT}
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                spillMorph(bot, v as (typeof BOT_MORPHS)[number]);
                e.target.value = '';
              }}
            >
              <option value="">Spill morph…</option>
              {BOT_MORPHS.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-label text-fg">Følg peker</span>
            <Switch checked={folgPeker} onCheckedChange={setFolgPeker} aria-label="Følg peker" />
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
