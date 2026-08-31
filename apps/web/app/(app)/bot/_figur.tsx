'use client';

import { ENDWISE_BLOB, ENDWISE_SHAPE_ID } from '@endwise/ui/morph-bot/endwise-splice';
import { useEffect, useRef } from 'react';
import { lesTema, type Tema } from '../_lib/tema';
import type { BotMorph, BotTilstand } from './_katalog';

type MorphBotEl = HTMLElement & {
  setState: (state: BotTilstand, options?: { replay?: boolean }) => MorphBotEl;
  playMorph: (
    effect: BotMorph,
    options?: { hold?: number; restore?: BotTilstand | 'default' | null },
  ) => Promise<unknown>;
  setShape: (shape: string) => MorphBotEl;
};

function fargerFor(tema: Tema): { kropp: string; oyne: string } {
  if (tema === 'dark') {
    return { kropp: ENDWISE_BLOB.color.darkBody, oyne: ENDWISE_BLOB.color.darkEyes };
  }
  return { kropp: ENDWISE_BLOB.color.body, oyne: ENDWISE_BLOB.color.eyes };
}

/**
 * Ett <morph-bot>-element. Tilstand og Morph går via setState/playMorph —
 * elementet remountes ikke. Form er låst til endwise.
 */
export function BotFigur({
  tilstand,
  storrelse,
  folgPeker,
  onReady,
}: {
  tilstand: BotTilstand;
  storrelse: number;
  folgPeker: boolean;
  onReady: (el: MorphBotEl | null) => void;
}) {
  const ref = useRef<MorphBotEl | null>(null);
  const temaRef = useRef<Tema>('light');

  useEffect(() => {
    const el = ref.current;
    onReady(el);
    return () => onReady(null);
  }, [onReady]);

  useEffect(() => {
    const sync = () => {
      const tema = lesTema();
      temaRef.current = tema;
      const el = ref.current;
      if (!el) return;
      const { kropp, oyne } = fargerFor(tema);
      el.setAttribute('color', kropp);
      el.setAttribute('eye-color', oyne);
    };
    sync();
    const root = document.documentElement;
    const obs = new MutationObserver(sync);
    obs.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el?.setState) return;
    el.setState(tilstand);
  }, [tilstand]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute('size', String(storrelse));
  }, [storrelse]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.toggleAttribute('follow-pointer', folgPeker);
  }, [folgPeker]);

  const start = fargerFor('light');

  return (
    <morph-bot
      ref={ref}
      shape={ENDWISE_SHAPE_ID}
      state="idle"
      size={storrelse}
      color={start.kropp}
      eye-color={start.oyne}
      follow-pointer=""
      label="Bot"
    />
  );
}

export function spillMorph(el: MorphBotEl | null, morph: BotMorph) {
  if (!el?.playMorph) return;
  void el.playMorph(morph);
}

export type { MorphBotEl };
