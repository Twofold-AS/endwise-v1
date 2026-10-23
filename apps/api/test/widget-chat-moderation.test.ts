import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));
const kilde = readFileSync(resolve(her, '../src/routes/widget/chat.ts'), 'utf8');

/**
 * F14-05 — Moderasjonsfeil er fail-closed. En nede Mistral-moderation
 * skal ikke slippe kundetekst gjennom til hovedmodellen.
 */
describe('widget-chat moderasjon fail-closed (F14-05)', () => {
  it('har ikke fail-open catch som later som meldingen er tillatt', () => {
    expect(kilde).not.toMatch(/\.catch\(\s*\(\)\s*=>\s*\(\s*\{\s*allowed:\s*true/);
  });

  it('ruter moderasjonsfeil til samme menneske-flyt som sensitiv treff', () => {
    expect(kilde).toMatch(/WIDGET_AI_HANDOVER/);
    expect(kilde).toMatch(/escalated:\s*true/);
    expect(kilde).toMatch(/catch\s*\{/);
  });
});
