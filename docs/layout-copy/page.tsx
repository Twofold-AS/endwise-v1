'use client';

// Public homepage / showcase — now lives at `/` (UI-7, 2026-07-02). The authed
// dashboard moved to `/dashboard` inside the (app) shell; this top-level route
// sits outside (app), so it inherits only the root layout (ColorBends/DotField
// backdrop + tRPC/theme providers) and carries no auth guard.
//
// Demonstrates what TheFold is: a hero with the rolling wordmark + slot-text
// counters over an ember glow, then a section per pillar (My Agents, Loops,
// Tool selection, Calendar + team, Voice), each with a lightweight in-page mock
// (no screenshots on disk yet). CTAs route to sign in / get started; a signed-in
// visitor sees a subtle "Go to dashboard" CTA in the nav (MarketingTopNav) and
// hero instead.

import { AnimatedWordmark } from '@/components/marketing/animated-wordmark';
import { MarketingTopNav } from '@/components/marketing/marketing-top-nav';
import { SlotMetric } from '@/components/slot-metric';
import { Button } from '@/components/ui/button';
import { useSession } from '@/lib/auth-client';
import {
  ArrowRight,
  CalendarDays,
  Check,
  LayoutDashboard,
  Lock,
  Mic,
  Sparkles,
  Workflow,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen w-full text-white">
      <MarketingTopNav active="/" />
      <Hero />
      <Pillars />
      <ClosingCta />
      <Footer />
    </div>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  const { data: session } = useSession();
  const authed = Boolean(session);
  return (
    <section className="relative overflow-hidden">
      {/* Ember glow — warm amber→ember radial behind the hero copy. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-120px] h-[460px] w-[820px] max-w-[120vw] -translate-x-1/2 opacity-70 blur-3xl"
        style={{
          background:
            'radial-gradient(closest-side, var(--tf-glow-a), var(--tf-glow-b) 55%, transparent 80%)',
        }}
      />
      <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 px-5 pb-16 pt-20 text-center sm:pt-28">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[12px] text-white/70">
          <Sparkles size={12} className="thefold-glow" />
          The agent platform for agencies
        </span>

        <h1 className="flex flex-col items-center gap-2 text-balance">
          <AnimatedWordmark size="xl" withLogo={false} />
          <span className="max-w-2xl text-2xl font-semibold leading-tight tracking-tight text-white/90 sm:text-3xl">
            Agents that stay on plan, pick the right tools, and ship the work.
          </span>
        </h1>

        <p className="max-w-xl text-balance text-[15px] leading-relaxed text-white/65">
          Give every project its own agents. Orchestrate multi-step loops, lock tools to the job,
          and keep everything pointed at the vision — by chat or by voice.
        </p>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          {authed ? (
            <>
              {/* Signed-in visitors get a subtle route back into the app. */}
              <Button asChild variant="primary" size="lg">
                <Link href="/dashboard">
                  <LayoutDashboard size={15} />
                  Go to dashboard
                </Link>
              </Button>
              <Button asChild variant="glass" size="lg">
                <Link href="/docs">Read the docs</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="primary" size="lg">
                <Link href="/signup">
                  Get started
                  <ArrowRight size={15} />
                </Link>
              </Button>
              <Button asChild variant="glass" size="lg">
                <Link href="/docs">Read the docs</Link>
              </Button>
            </>
          )}
        </div>

        {/* Rolling slot-text counters. */}
        <dl className="mt-10 grid w-full max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
          <Counter value={12480} label="Agent runs" />
          <Counter value={8600} label="Hours saved" suffix="+" />
          <Counter value={340} label="Agents launched" />
          <Counter value={48} label="Tool categories" />
        </dl>
      </div>
    </section>
  );
}

function Counter({ value, label, suffix }: { value: number; label: string; suffix?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <dd className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        <SlotMetric value={value} format="compact" suffix={suffix} />
      </dd>
      <dt className="text-[12px] text-white/55">{label}</dt>
    </div>
  );
}

// ── Pillars ──────────────────────────────────────────────────────────────────

function Pillars() {
  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-5 px-5 py-8">
      <FeatureRow
        icon={Sparkles}
        eyebrow="My Agents"
        title="A roster of agents per project"
        body="Each project gets its own agents — plus a private Home Agent that inherits the project vision and feature list. Build specialists, give them a tagline and instructions, and put them to work."
        mock={<MyAgentsMock />}
      />
      <FeatureRow
        icon={Workflow}
        eyebrow="Loops"
        title="Multi-step orchestration that builds itself"
        body="A loop breaks a goal into milestones and runs a stack of agents to complete them — planning, executing, verifying — with a live cost badge and a Stop button you can always reach."
        mock={<LoopsMock />}
        reverse
      />
      <FeatureRow
        icon={Wrench}
        eyebrow="Tool selection"
        title="The right tools, locked to the role"
        body="Tools are grouped into categories. An agent's role whitelists which categories it can touch; everything else is dimmed and explained. No tool-overload, no surprises."
        mock={<ToolSelectionMock />}
      />
      <FeatureRow
        icon={CalendarDays}
        eyebrow="Calendar + team"
        title="Knows the team and the calendar"
        body="Agents can find an open slot, log time against a project, and check who on the team is available — the same primitives your humans use, exposed as tools."
        mock={<CalendarMock />}
        reverse
      />
      <FeatureRow
        icon={Mic}
        eyebrow="Voice"
        title="Talk to Kråka from anywhere"
        body="The floating dock follows you across the app. Type to it, or hold the mic and talk — a realtime voice session with the same agent, the same context."
        mock={<VoiceMock />}
      />
    </section>
  );
}

function FeatureRow({
  icon: Icon,
  eyebrow,
  title,
  body,
  mock,
  reverse,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  mock: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div
      className={`grid items-center gap-6 rounded-[var(--radius-xl)] border border-white/10 bg-white/[0.03] p-6 sm:p-8 md:grid-cols-2 ${
        reverse ? 'md:[&>*:first-child]:order-2' : ''
      }`}
    >
      <div className="flex flex-col gap-3">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-wide text-white/65">
          <Icon size={12} />
          {eyebrow}
        </span>
        <h3 className="text-xl font-semibold tracking-tight text-white">{title}</h3>
        <p className="text-[14px] leading-relaxed text-white/65">{body}</p>
      </div>
      <div className="min-w-0">{mock}</div>
    </div>
  );
}

// ── Mocks (lightweight, on-brand stand-ins for real screenshots) ─────────────

function MockShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass-surface flex flex-col gap-2 rounded-[var(--radius-xl)] p-4">
      {children}
    </div>
  );
}

function MyAgentsMock() {
  const agents = [
    { name: 'Kråka', tag: 'Home · private', initial: 'K' },
    { name: 'Scout', tag: 'Research', initial: 'S' },
    { name: 'Forge', tag: 'Code', initial: 'F' },
    { name: 'Vei', tag: 'Design', initial: 'V' },
  ];
  return (
    <MockShell>
      {agents.map((a) => (
        <div key={a.name} className="flex items-center gap-3 rounded-lg bg-white/[0.04] px-3 py-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-white/10 text-[12px] font-semibold text-white">
            {a.initial}
          </span>
          <span className="text-[13px] font-medium text-white">{a.name}</span>
          <span className="ml-auto text-[11px] text-white/45">{a.tag}</span>
        </div>
      ))}
    </MockShell>
  );
}

function LoopsMock() {
  const steps = [
    { label: 'Plan milestones', done: true },
    { label: 'Draft implementation', done: true },
    { label: 'Run verifier', done: false },
    { label: 'Open PR', done: false },
  ];
  return (
    <MockShell>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[12px] font-medium text-white/80">build · landing-refresh</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] tabular-nums text-white/70">
          $0.42
        </span>
      </div>
      <div className="relative flex flex-col gap-2 pl-4">
        <span aria-hidden className="absolute left-[7px] top-2 bottom-2 w-px bg-white/15" />
        {steps.map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            <span
              className={`z-10 size-3.5 rounded-full border ${
                s.done ? 'border-transparent bg-white' : 'border-white/30 bg-white/10'
              }`}
            />
            <span className={`text-[13px] ${s.done ? 'text-white/55 line-through' : 'text-white'}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </MockShell>
  );
}

function ToolSelectionMock() {
  const cats = [
    { name: 'Code & repos', allowed: true },
    { name: 'Research & web', allowed: true },
    { name: 'Calendar & time', allowed: true },
    { name: 'Billing & payments', allowed: false },
    { name: 'Admin & destructive', allowed: false },
  ];
  return (
    <MockShell>
      {cats.map((c) => (
        <div
          key={c.name}
          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 ${
            c.allowed ? 'bg-white/[0.05]' : 'bg-white/[0.02]'
          }`}
        >
          {c.allowed ? (
            <Check size={14} className="text-white" />
          ) : (
            <Lock size={13} className="text-white/35" />
          )}
          <span className={`text-[13px] ${c.allowed ? 'text-white' : 'text-white/40'}`}>
            {c.name}
          </span>
          <span
            className={`ml-auto h-4 w-7 rounded-full p-0.5 ${
              c.allowed ? 'bg-white/80' : 'bg-white/15'
            }`}
          >
            <span
              className={`block size-3 rounded-full bg-[#14141a] transition-transform ${
                c.allowed ? 'translate-x-3' : ''
              }`}
            />
          </span>
        </div>
      ))}
    </MockShell>
  );
}

function CalendarMock() {
  const week = [
    { day: 'M', busy: 2 },
    { day: 'T', busy: 0 },
    { day: 'W', busy: 3 },
    { day: 'T', busy: 1 },
    { day: 'F', busy: 0 },
  ];
  return (
    <MockShell>
      <span className="mb-1 text-[12px] font-medium text-white/80">This week · availability</span>
      <div className="grid grid-cols-5 gap-2">
        {week.map((d, i) => (
          <div key={`${d.day}-${i}`} className="flex flex-col items-center gap-1.5">
            <span className="text-[11px] text-white/50">{d.day}</span>
            <div className="flex h-16 w-full flex-col justify-end gap-1 rounded-lg bg-white/[0.04] p-1.5">
              {['s0', 's1', 's2'].map((slotId, slot) => (
                <span
                  key={slotId}
                  className={`h-3 rounded-sm ${slot < d.busy ? 'bg-white/70' : 'bg-white/10'}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-white/45">
        “Find a 1-hour slot on Acme and log it to design.”
      </p>
    </MockShell>
  );
}

function VoiceMock() {
  return (
    <MockShell>
      <div className="flex items-center gap-3 rounded-pill bg-white/[0.06] px-3 py-2">
        <span className="relative flex size-8 items-center justify-center rounded-full bg-white/10 text-[13px] font-semibold text-white">
          K<span className="ember-pulse absolute -right-0.5 -top-0.5 size-2.5 rounded-full" />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="text-[13px] font-medium text-white">Kråka</span>
          <span className="thefold-glow text-[11px]">Listening…</span>
        </div>
        <span className="ml-auto inline-flex size-7 items-center justify-center rounded-full bg-white/10 text-white">
          <Mic size={13} />
        </span>
      </div>
      <p className="px-1 text-[11px] text-white/45">Press V anywhere to talk; C to type.</p>
    </MockShell>
  );
}

// ── Closing CTA + footer ─────────────────────────────────────────────────────

function ClosingCta() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-16 text-center">
      <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-white/10 bg-white/[0.03] p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-[-60px] mx-auto h-[200px] w-[400px] opacity-60 blur-3xl"
          style={{
            background: 'radial-gradient(closest-side, var(--tf-glow-a), transparent 75%)',
          }}
        />
        <h2 className="relative text-2xl font-semibold tracking-tight text-white">
          Put your first agent to work
        </h2>
        <p className="relative mx-auto mt-2 max-w-md text-[14px] text-white/65">
          Spin up a project, point an agent at the vision, and let the loop run.
        </p>
        <div className="relative mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild variant="primary" size="lg">
            <Link href="/signup">
              Get started
              <ArrowRight size={15} />
            </Link>
          </Button>
          <Button asChild variant="glass" size="lg">
            <Link href="/demo/krarka">See the demo</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 sm:flex-row">
        <AnimatedWordmark size="md" />
        <nav className="flex items-center gap-4 text-[12px] text-white/50">
          <Link href="/docs" className="hover:text-white">
            Docs
          </Link>
          <Link href="/demo/krarka" className="hover:text-white">
            Demo
          </Link>
          <Link href="/signin" className="hover:text-white">
            Sign in
          </Link>
        </nav>
        <span className="text-[12px] text-white/40">© TheFold</span>
      </div>
    </footer>
  );
}
