import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('Mikael 08.09 — Ronny tema + standardfelt', () => {
  it('Ronny bruker tema-farger uten ink-invert (øyne synlige i begge modi)', () => {
    const bot = les('../app/(app)/_workshop/ronny-bot.tsx');
    const farger = les('../app/(app)/_workshop/ronny-farger.ts');
    const tema = les('../../../packages/ui/src/theme.css');
    const profil = les('../app/(app)/_shell/phone-chrome.ts');
    expect(bot).not.toMatch(/ink-invert/);
    expect(bot).toMatch(/ronnyTemaFarger/);
    expect(bot).toMatch(/data-ronny-los/);
    expect(bot).toMatch(/follow=\{false\}/);
    expect(tema).toMatch(/\[data-ronny-los="dark"\]/);
    expect(tema).toMatch(/\.ew-profil-sirkel/);
    const globals = les('../app/globals.css');
    expect(globals).toMatch(/@custom-variant dark/);
    expect(farger).toMatch(/#141414/);
    expect(farger).toMatch(/#f3f3f3/);
    expect(farger).toMatch(/lesDomLos/);
    expect(farger).not.toMatch(/#ffffff/);
    expect(bot).not.toMatch(/#1d1d1f/);
    expect(tema).toMatch(/\.ink-invert/);
    expect(profil).toMatch(/PHONE_PROFIL_SIRKEL[\s\S]*ew-profil-sirkel/);
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
    expect(tema).toMatch(/\.ew-felt-sok/);
    expect(tema).toMatch(/\.ew-modus-plate/);
  });

  it('profilmeny-hårlinjer bruker .ew-haarlinje (fg-faint, synlig mot surface)', () => {
    const tema = les('../../../packages/ui/src/theme.css');
    const meny = les('../app/(app)/_shell/phone-profil-meny.tsx');
    expect(tema).toMatch(/\.ew-haarlinje\s*\{/);
    expect(tema).toMatch(/border-top:\s*1px solid var\(--ew-fg-faint\)/);
    expect(meny).toMatch(/ew-haarlinje/);
    expect(meny).not.toMatch(/h-px bg-border/);
    expect(meny).toMatch(/PHONE_PROFIL_VILKAR/);
    expect(meny).toMatch(/PHONE_PROFIL_RAD/);
  });

  it('visuell GO-side monterer ekte Ronny, profilmeny og PromptInput', () => {
    const go = les('../app/visuell/mikael/page.tsx');
    expect(go).toMatch(/RonnyBot/);
    expect(go).toMatch(/PhoneProfilMeny/);
    expect(go).toMatch(/tvingVis/);
    expect(go).toMatch(/PromptInput/);
    expect(go).toMatch(/bg-surface text-fg/);
    expect(go).toMatch(/PhoneSokFelt|ew-felt ew-felt-sm/);
    const layout = les('../app/visuell/layout.tsx');
    expect(layout).toMatch(/endwise:tema/);
    expect(layout).toMatch(/tema/);
  });
});
