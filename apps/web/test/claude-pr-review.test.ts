import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FORHANDLER_NAV } from '../app/(app)/_shell/nav.ts';
import { DEALER_PULSE_KEYS } from '../app/(app)/_shell/phone-home.ts';
import { PR_REVIEW_DELER, PR_REVIEW_TITTEL } from '../app/pr-review/_innhold.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('PR #178 review-side /pr-review', () => {
  it('samler alle Claude-preview-ruter med norsk tekst og telefon-iframe', () => {
    expect(PR_REVIEW_TITTEL).toBe('PR #178 – Claude Design inn i Endwise');
    expect(PR_REVIEW_DELER.map((d) => [d.id, d.rute])).toEqual([
      ['verkstedet', '/pulse-preview'],
      ['kunder', '/kunder-preview'],
      ['timeplan', '/jobber-preview'],
      ['innboks', '/innboks-preview'],
      ['ny-jobb', '/visual-forms-preview'],
      ['lager', '/lager-preview'],
      ['butikk', '/butikk-preview'],
      ['tjenester', '/tjenester-preview'],
      ['org', '/org-preview'],
      ['fix-a', '/kunder-preview'],
    ]);
    const side = utenKommentarer(les('../app/pr-review/page.tsx'));
    expect(side).toMatch(/data-pr-review="go"/);
    expect(side).toMatch(/Innhold/);
    expect(side).toMatch(/Åpne i fullskjerm/);
    expect(side).toMatch(/Nytt fra Claude/);
    expect(side).toMatch(/Ekte data \(tRPC\)/);
    expect(side).toMatch(/Ærlig stubb/);
    expect(side).toMatch(/Test dette/);
    expect(side).not.toMatch(/#0066ff/);
    expect(side).not.toMatch(/shadow-/);
    const ramme = utenKommentarer(les('../app/pr-review/_ramme.tsx'));
    expect(ramme).toMatch(/data-pr-review-iframe/);
    expect(ramme).toMatch(/width=\{390\}/);
    expect(ramme).toMatch(/height=\{844\}/);
    expect(ramme).toMatch(/h-\[844px\]/);
    expect(ramme).toMatch(/nextjs-portal/);
    const css = les('../app/pr-review/preview.css');
    expect(css).toMatch(/nextjs-portal/);
    expect(css).toMatch(/display:\s*none/i);
  });

  it('iframe-headere tillater same-origin og chrome-låser er urørt', () => {
    const cfg = utenKommentarer(les('../next.config.ts'));
    expect(cfg).toMatch(/frame-ancestors 'self'/);
    expect(cfg).toMatch(/SAMEORIGIN/);
    expect(cfg).not.toMatch(/X-Frame-Options.*DENY/);
    expect([...DEALER_PULSE_KEYS]).toEqual([
      'idag',
      'innboks',
      'lager',
      'analyser',
      'team',
      'jobb',
    ]);
    expect(FORHANDLER_NAV.some((n) => n.href === '/kunder')).toBe(true);
    expect(FORHANDLER_NAV.some((n) => n.href === '/pr-review')).toBe(false);
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    expect(hjem).toMatch(/PulseAnalyserKort/);
    expect(hjem).not.toMatch(/pr-review/);
  });
});
