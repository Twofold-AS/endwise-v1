import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Linear dark dealer-chrome + sidebar-align', () => {
  it('html forblir light; app-skall setter dark/Linear', () => {
    const rot = les('../app/layout.tsx');
    const app = utenKommentarer(les('../app/(app)/layout.tsx'));
    expect(rot).toMatch(/data-theme="light"/);
    expect(app).toMatch(/data-theme="dark"/);
    expect(app).toMatch(/data-app-theme="linear"/);
    expect(app).toMatch(/md:w-\[1050px\]/);
    expect(app).toMatch(/md:w-\[598px\]/);
  });

  it('offentlig landing-CTA forblir Apple Action Blue', () => {
    const cta = les('../app/_markeds/cta.ts');
    expect(cta).toMatch(/#0066cc/);
    expect(cta).toMatch(/#0071e3/);
    expect(cta).not.toMatch(/#e4f222/);
    expect(cta).not.toMatch(/#407ff2/);
  });

  it('nav-boks flush-right; tekst venstre, ikon høyre, synlig gap', () => {
    const sidebar = utenKommentarer(les('../app/(app)/_shell/sidebar.tsx'));
    expect(sidebar).toMatch(/md:ml-auto/);
    expect(sidebar).toMatch(/md:w-\[275px\]/);
    expect(sidebar).toMatch(/md:w-\[259px\]/);
    expect(sidebar).toMatch(/md:w-\[389px\]/);
    expect(sidebar).toMatch(/justify-between/);
    expect(sidebar).toMatch(/gap-3/);
    expect(sidebar).toMatch(/text-left/);
    expect(sidebar).not.toMatch(/md:text-right/);
    expect(sidebar).toMatch(/before:bg-primary/);
    const label = sidebar.indexOf('item.label');
    const ikon = sidebar.indexOf('<Ikon');
    expect(label).toBeGreaterThan(-1);
    expect(ikon).toBeGreaterThan(label);
  });

  it('Oppgrader-CTA er lime uten Galaxy; Enterprise-merke beholder Galaxy', () => {
    const pille = utenKommentarer(les('../app/(app)/_shell/oppgrader-pille.tsx'));
    expect(pille).toMatch(/bg-primary text-primary-foreground/);
    expect(pille).toMatch(/<GalaxyKlipp/);
    expect(pille).toMatch(/if \(!cta\)/);
    const merkeGalaxy = pille.indexOf('<GalaxyKlipp');
    const ctaReturn = pille.lastIndexOf('return (');
    expect(merkeGalaxy).toBeGreaterThan(-1);
    expect(merkeGalaxy).toBeLessThan(ctaReturn);
    expect(pille.slice(ctaReturn)).not.toMatch(/<GalaxyKlipp/);
  });
});
