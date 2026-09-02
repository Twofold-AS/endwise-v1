import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('iOS Safari — felt ≥16px på telefon, pinch-zoom urørt', () => {
  it('viewport tillater zoom — ingen maximum-scale=1 / user-scalable=no', () => {
    const rot = les('../app/layout.tsx');
    const offline = les('../public/offline.html');
    expect(rot).toMatch(/viewportFit:\s*['"]cover['"]/);
    expect(rot).not.toMatch(/maximumScale\s*:/);
    expect(rot).not.toMatch(/userScalable\s*:/);
    expect(rot).toMatch(/Pinch-zoom beholdes/);
    expect(offline).not.toMatch(/maximum-scale\s*=\s*1|user-scalable\s*=\s*no/);
  });

  it('global regel setter minst 16px på input/textarea/select/contenteditable under md', () => {
    const css = les('../app/globals.css');
    expect(css).toMatch(/max-width:\s*767\.98px/);
    expect(css).toMatch(/font-size:\s*max\(16px,\s*100%\)\s*!important/);
    expect(css).toMatch(/textarea/);
    expect(css).toMatch(/contenteditable/);
    expect(css).toMatch(/Pinch-zoom beholdes/);
    expect(css).not.toMatch(/maximum-scale\s*=/);
    expect(css).not.toMatch(/user-scalable\s*=/);
  });

  it('Prompt Input og Ronny-composer er 16px på telefon, logg-bobler 14px', () => {
    const prompt = les('../../../packages/ui/src/components/prompt-input.tsx');
    const fab = les('../app/(app)/_workshop/workshop-bloub.tsx');
    const innboks = les('../app/(app)/innboks/[id]/page.tsx');
    expect(prompt).toMatch(/text-\[16px\].*md:text-label/);
    expect(fab).toMatch(/text-\[16px\]/);
    expect(fab).toMatch(/data-ronny-composer/);
    expect(fab).toMatch(/const BOBLE_TEKST = 'text-\[14px\]/);
    expect(innboks).toMatch(/PromptInputTextarea[\s\S]*text-\[16px\]/);
  });

  it('innlogging og OTP-felter er minst 16px', () => {
    const felter = les('../app/_auth/felter.tsx');
    const signin = les('../app/signin/signin-skjema.tsx');
    const totp = les('../app/2fa-oppsett/page.tsx');
    const bytt = les('../app/(app)/_shell/bytt-epost.tsx');
    expect(felter).toMatch(/text-body/);
    expect(signin).toMatch(/signin-totp[\s\S]*text-\[16px\]/);
    expect(signin).toMatch(/signin-magic-kode[\s\S]*text-\[16px\]/);
    expect(totp).toMatch(/tfa-kode[\s\S]*text-\[16px\]/);
    expect(bytt).toMatch(/bytt-epost-totp[\s\S]*text-\[16px\]/);
  });
});
