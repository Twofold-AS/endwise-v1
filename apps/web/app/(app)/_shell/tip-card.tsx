'use client';

import { Brain, Handshake, type LucideIcon, ShieldCheck, Sparkles } from '@endwise/ui';
import { useEffect, useState } from 'react';

/**
 * Mini-slider nederst i sidebaren: forklarer én ting av gangen.
 *
 * Hensikten er ikke å fylle plass — det er at «Samarbeid» og «AI-verktøy» er
 * ord som ikke forklarer seg selv for en verkstedeier som logger inn første
 * gang. Ett kort, ett begrep, én setning.
 *
 * Bytter automatisk hvert 9. sekund, men **ikke** hvis brukeren har bedt om
 * mindre bevegelse — da står den stille og byttes kun med prikkene.
 */
type Tips = { icon: LucideIcon; title: string; body: string };

const TIPS: Tips[] = [
  {
    icon: Handshake,
    title: 'Samarbeid',
    body: 'Del rutiner og prisnivå med andre Endwise-verksteder. Aldri kundedata — kun det du selv publiserer.',
  },
  {
    icon: Brain,
    title: 'AI-verktøy',
    body: 'Spør assistenten om din egen drift under «Innsikt». Den ser bare ditt verksted, aldri andres.',
  },
  {
    icon: Sparkles,
    title: 'Innboks',
    body: 'Kunder, mekanikere og Endwise i samme innboks. Assistenten svarer først og henter deg når den bør.',
  },
  {
    icon: ShieldCheck,
    title: 'Saker',
    body: 'Bookinger og kalender er samme sted. Kalenderen er en visning, ikke en egen side.',
  },
];

const INTERVAL_MS = 9000;

export function TipCard() {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % TIPS.length), INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  const tips = TIPS[i];

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-bg p-3">
      <div className="flex items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-control bg-accent-soft text-accent-strong">
          <tips.icon size={16} strokeWidth={1.75} />
        </span>
        <span className="min-w-0 truncate text-label text-fg">{tips.title}</span>
      </div>

      <p className="text-[12px] text-fg-muted leading-relaxed">{tips.body}</p>

      <div className="flex items-center gap-1.5">
        {TIPS.map((t, n) => (
          <button
            key={t.title}
            type="button"
            onClick={() => setI(n)}
            aria-label={`Vis tips: ${t.title}`}
            aria-current={n === i}
            className={`h-1.5 rounded-pill transition-all ${
              n === i ? 'w-4 bg-accent-strong' : 'w-1.5 bg-border hover:bg-border-strong'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
