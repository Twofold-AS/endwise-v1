import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../src/tokens.css', import.meta.url), 'utf8');
const darkAt = css.indexOf('[data-theme="dark"] {');
const light = css.slice(0, darkAt);
const dark = css.slice(darkAt);

describe('Linear-palett og scoped tema', () => {
  it('kanoniske Linear-navn ligger på :root', () => {
    expect(css).toMatch(/--color-void:\s*#08090a/);
    expect(css).toMatch(/--color-carbon:\s*#0f1011/);
    expect(css).toMatch(/--color-obsidian:\s*#161718/);
    expect(css).toMatch(/--color-graphite:\s*#23252a/);
    expect(css).toMatch(/--color-smoke:\s*#383b3f/);
    expect(css).toMatch(/--color-ash:\s*#62666d/);
    expect(css).toMatch(/--color-fog:\s*#8a8f98/);
    expect(css).toMatch(/--color-mist:\s*#d0d6e0/);
    expect(css).toMatch(/--color-bone:\s*#e5e5e6/);
    expect(css).toMatch(/--color-paper:\s*#ffffff/);
    expect(css).toMatch(/--color-acid-lime:\s*#e4f222/);
    expect(css).toMatch(/--color-pulse-green:\s*#27a644/);
    expect(css).toMatch(/--color-coral-red:\s*#eb5757/);
    expect(css).toMatch(/--color-signal-teal:\s*#02b8cc/);
    expect(css).toMatch(/--color-iris-violet:\s*#6366f1/);
    expect(css).toMatch(/--color-lavender:\s*#8b5cf6/);
  });

  it('lyst tema beholdes for landing/widget (Attio/Apple, ikke lime-CTA)', () => {
    expect(light).toMatch(/--ew-bg:\s*#f3f4f6/);
    expect(light).toMatch(/--ew-sidebar:\s*#f8f8f8/);
    expect(light).toMatch(/--ew-sidebar-active:\s*#eaf1ff/);
    expect(light).toMatch(/--ew-surface:\s*#ffffff/);
    expect(light).toMatch(/--ew-fg:\s*#1c1d1f/);
    expect(light).toMatch(/--ew-ink-utility:\s*#1c1d1f/);
    expect(light).toMatch(/--ew-accent:\s*#407ff2/);
    expect(light).toMatch(/--ew-focus:\s*#94b9ff/);
    expect(light).toMatch(/--ew-border:\s*#e4e7ec/);
    expect(light).toMatch(/--ew-border-strong:\s*#d3d8df/);
    expect(light).toMatch(/--ew-fg-muted:\s*#8f99a8/);
    expect(light).not.toMatch(/--ew-ink-utility:\s*#e4f222/);
    expect(light).toMatch(/--ew-bevel-shadow:\s*none/);
    expect(css).toMatch(/--ew-radius-pill:\s*9999px/);
    expect(css).toMatch(/--ew-space-24:\s*96px/);
  });

  it('mørkt tema er Linear midnight for dealer/app', () => {
    expect(dark).toMatch(/--ew-bg:\s*var\(--color-void\)/);
    expect(dark).toMatch(/--ew-sidebar:\s*var\(--color-carbon\)/);
    expect(dark).toMatch(/--ew-surface:\s*var\(--color-carbon\)/);
    expect(dark).toMatch(/--ew-surface-2:\s*var\(--color-obsidian\)/);
    expect(dark).toMatch(/--ew-sidebar-active:\s*var\(--color-graphite\)/);
    expect(dark).toMatch(/--ew-border:\s*var\(--color-graphite\)/);
    expect(dark).toMatch(/--ew-border-strong:\s*var\(--color-smoke\)/);
    expect(dark).toMatch(/--ew-fg:\s*var\(--color-mist\)/);
    expect(dark).toMatch(/--ew-heading:\s*var\(--color-paper\)/);
    expect(dark).toMatch(/--ew-fg-muted:\s*var\(--color-fog\)/);
    expect(dark).toMatch(/--ew-ink-utility:\s*var\(--color-acid-lime\)/);
    expect(dark).toMatch(/--ew-accent:\s*var\(--color-acid-lime\)/);
    expect(dark).toMatch(/--ew-accent-fg:\s*var\(--color-void\)/);
    expect(dark).toMatch(/--ew-success:\s*var\(--color-pulse-green\)/);
    expect(dark).toMatch(/--ew-danger:\s*var\(--color-coral-red\)/);
    expect(dark).toMatch(/--ew-radius-control:\s*6px/);
    expect(dark).toMatch(/--ew-radius-xl:\s*12px/);
    expect(dark).toMatch(/--ew-badge-radius:\s*4px/);
    expect(dark).not.toMatch(/--ew-bg:\s*#000000/);
    expect(dark).toMatch(/--ew-bevel-shadow:\s*none/);
  });
});
