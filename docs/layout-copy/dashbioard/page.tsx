'use client';

// /dev/redesign/dashboard — the CHAT content-area, rendered inside the shared
// AppShell (../_shell/app-shell). The shell (top-bar + sidebar) + design tokens
// + card system live in that module; this file is only the chat-mode content:
// the "Easier with TheFold" wordmark, a custom chat input in the border-beam,
// and the feature-discovery cards. NOT wired to prod — all mock.

import { ArrowUp, ArrowUpRight, Plus } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import type * as React from 'react';

import { Button } from '@/components/ui/button';
import { TheFoldBeam } from '@/components/ui/thefold-beam';
import { AppShell, BEVEL, C, Card } from '../_shell/app-shell';
import { GradientBg } from '../_shell/gradient-bg';

// Feature cards under the chat input — split-card variant (image with a corner
// "open" bevel button, title + desc overlaid bottom-left, no icon).
const FEATURE_CARDS: { title: string; desc: string; imageSrc?: string }[] = [
  {
    title: 'Integrations',
    desc: 'Connect 3000+ apps via Composio to your agents',
    imageSrc: '/images/integration.png',
  },
  {
    title: 'AI providers',
    desc: 'Connect the models your agents run on',
    imageSrc: '/images/providers.png',
  },
  // memory image still missing — falls back to the placeholder
  { title: 'Memory', desc: 'What your agents remember across chats' },
  {
    title: 'Skills',
    desc: 'Reusable capabilities you build or import',
    imageSrc: '/images/skills.png',
  },
];

// Local chat input — split-card colours, a tall field, a "+" tool picker on the
// left and a black-bevel Send button (arrow-up) on the right.
function ChatInput({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  const canSend = value.trim().length > 0;
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) onSubmit();
    }
  }
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Ask anything…"
        className="w-full resize-none border-none bg-transparent outline-none placeholder:text-[#7e7e7e]"
        style={{ minHeight: 120, maxHeight: 260, color: C.text, fontSize: 14, lineHeight: 1.45 }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          type="button"
          aria-label="Add tool"
          className="flex size-7 items-center justify-center rounded-lg text-[#a1a1a1] transition-colors hover:bg-[#262626] hover:text-white"
        >
          <Plus size={16} strokeWidth={2} />
        </button>
        <Button
          variant="dark"
          size="sm"
          onClick={() => canSend && onSubmit()}
          disabled={!canSend}
          style={{ background: C.border }}
        >
          Send
          <ArrowUp size={14} />
        </Button>
      </div>
    </div>
  );
}

// FEATURE-CARD — image with a bevel "open" button (diagonal arrow) top-right and
// title + description overlaid in the bottom-left corner.
function FeatureCard({
  title,
  desc,
  imageSrc,
}: { title: string; desc: string; imageSrc?: string }) {
  return (
    <Card style={{ overflow: 'hidden' }}>
      <div
        style={{
          position: 'relative',
          height: 160,
          borderRadius: 8,
          overflow: 'hidden',
          background: '#0e0e0e',
        }}
      >
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt=""
            fill
            sizes="320px"
            quality={95}
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <GradientBg variant="slate" />
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 42%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <button
          type="button"
          aria-label={`Open ${title}`}
          className="absolute right-2 top-2 z-[2] flex size-7 items-center justify-center rounded-lg text-white transition hover:brightness-110"
          style={BEVEL}
        >
          <ArrowUpRight size={15} strokeWidth={2} />
        </button>
        <div style={{ position: 'absolute', left: 10, right: 10, bottom: 10, zIndex: 2 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#ffffff' }}>{title}</div>
          <div
            style={{ fontSize: 11, lineHeight: 1.3, color: 'rgba(255,255,255,0.82)', marginTop: 2 }}
          >
            {desc}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function RedesignDashboardPage() {
  const [msg, setMsg] = useState('');

  return (
    <AppShell>
      {/* CHAT content-area — near the top, horizontally centred */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '96px 32px 32px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 620,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
          }}
        >
          {/* wordmark (Gelica medium) */}
          <span
            style={{
              fontFamily: 'var(--font-gelica)',
              fontWeight: 500,
              fontSize: 34,
              color: C.text,
            }}
          >
            Easier with TheFold
          </span>

          {/* chat input wrapped in the weakened, amber→white border-beam */}
          <TheFoldBeam
            borderRadius={12}
            className="w-full"
            colorVariant="sunset"
            strength={0.55}
            saturation={0.5}
            brightness={1.6}
          >
            <ChatInput value={msg} onChange={setMsg} onSubmit={() => setMsg('')} />
          </TheFoldBeam>

          {/* feature-discovery cards */}
          <div
            style={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 10,
            }}
          >
            {FEATURE_CARDS.map((c) => (
              <FeatureCard key={c.title} title={c.title} desc={c.desc} imageSrc={c.imageSrc} />
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
