import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('Mikael 08.09 — Ronny tema + standardfelt', () => {
  it('Ronny bruker ink-invert (samme polaritet som profil bg-fg)', () => {
    const bot = les('../app/(app)/_workshop/ronny-bot.tsx');
    const tema = les('../../../packages/ui/src/theme.css');
    const profil = les('../app/(app)/_shell/phone-chrome.ts');
    expect(bot).toMatch(/ink-invert/);
    expect(bot).toMatch(/#141414/);
    expect(bot).not.toMatch(/#1d1d1f/);
    expect(tema).toMatch(/\.ink-invert/);
    expect(tema).toMatch(/\.dark \.ink-invert/);
    expect(tema).toMatch(/brightness\(0\) invert\(1\)/);
    expect(profil).toMatch(/PHONE_PROFIL_SIRKEL[\s\S]*bg-fg[\s\S]*text-bg/);
  });

  it('Ronny-sheet og desktop-panel følger surface/fg, ikke #fff', () => {
    const fab = les('../app/(app)/_workshop/workshop-bloub.tsx');
    expect(fab).toMatch(/data-ronny-sheet[\s\S]{0,500}bg-surface text-fg/);
    expect(fab).toMatch(/data-ronny-desktop-panel[\s\S]{0,200}bg-surface text-fg/);
    expect(fab).toMatch(/text-title text-fg/);
    expect(fab).not.toMatch(/bg-\[#fff\]/);
    expect(fab).not.toMatch(/#1d1d1f/);
    expect(fab).not.toMatch(/paper="#ffffff"/);
  });

  it('standardfelt er .ew-felt i theme.css — prompt, Input og innlogging deler det', () => {
    const tema = les('../../../packages/ui/src/theme.css');
    const felt = les('../../../packages/ui/src/lib/felt.ts');
    const input = les('../../../packages/ui/src/primitives/input.tsx');
    const prompt = les('../../../packages/ui/src/components/prompt-input.tsx');
    const auth = les('../app/_auth/felter.tsx');
    expect(tema).toMatch(/\.ew-felt\s*\{/);
    expect(tema).toMatch(/background:\s*var\(--ew-inset\)/);
    expect(tema).toMatch(/border-radius:\s*var\(--ew-radius-sm\)/);
    expect(tema).toMatch(/border-color:\s*#ffffff/);
    expect(felt).toMatch(/export const FELT_LG = 'ew-felt ew-felt-lg'/);
    expect(felt).toMatch(/export const FELT_SM = 'ew-felt ew-felt-sm'/);
    expect(input).toMatch(/FELT_MD/);
    expect(prompt).toMatch(/FELT_SM/);
    expect(auth).toMatch(/FELT_LG/);
  });

  it('profilmeny-hårlinjer bruker .ew-haarlinje (fg-faint, synlig mot surface)', () => {
    const tema = les('../../../packages/ui/src/theme.css');
    const meny = les('../app/(app)/_shell/phone-profil-meny.tsx');
    expect(tema).toMatch(/\.ew-haarlinje\s*\{/);
    expect(tema).toMatch(/border-top:\s*1px solid var\(--ew-fg-faint\)/);
    expect(meny).toMatch(/ew-haarlinje/);
    expect(meny).not.toMatch(/h-px bg-border/);
    expect(meny).toMatch(/data-phone-profil-vilkar[\s\S]{0,220}text-\[17px\]/);
    expect(meny).toMatch(/data-phone-profil-vilkar[\s\S]{0,220}font-\[700\]/);
  });

  it('visuell GO-side monterer ekte Ronny, profilmeny og PromptInput', () => {
    const go = les('../app/visuell/mikael/page.tsx');
    expect(go).toMatch(/RonnyBot/);
    expect(go).toMatch(/PhoneProfilMeny/);
    expect(go).toMatch(/PromptInput/);
    expect(go).toMatch(/bg-surface text-fg/);
    expect(go).toMatch(/ew-felt ew-felt-sm/);
    const layout = les('../app/visuell/layout.tsx');
    expect(layout).toMatch(/endwise:tema/);
    expect(layout).toMatch(/tema/);
  });
});
