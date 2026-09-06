import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const theme = readFileSync(new URL('../src/theme.css', import.meta.url), 'utf8');

describe('Attio-roller i shadcn-broen', () => {
  it('--primary er ink-CTA, --ring er Focus Blue', () => {
    expect(theme).toMatch(/--primary:\s*var\(--ew-ink-utility\)/);
    expect(theme).toMatch(/--primary-foreground:\s*var\(--ew-accent-fg\)/);
    expect(theme).toMatch(/--ring:\s*var\(--ew-focus\)/);
    expect(theme).not.toMatch(/--primary:\s*var\(--ew-accent\)/);
    expect(theme).not.toMatch(/--ring:\s*var\(--ew-accent-strong\)/);
  });
});
