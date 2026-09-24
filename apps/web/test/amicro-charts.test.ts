import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const rot = dirname(fileURLToPath(import.meta.url));
const les = (rel: string) => readFileSync(join(rot, rel), 'utf8');

describe('Amicro dither charts på Rapporter', () => {
  it('Tall erstatter Analyse-canvas; ingen Recharts', () => {
    const analyse = les('../app/(app)/analyse/page.tsx');
    expect(analyse).toMatch(/PulseTallKort/);
    expect(analyse).not.toMatch(/DitherStackedChart/);
    expect(analyse).not.toMatch(/RevenueLineChart/);
    expect(analyse).not.toMatch(/#a43a0a|#407ff2|#0066ff/);
    expect(analyse).not.toMatch(/ChartContainer/);
    expect(analyse).not.toMatch(/from 'recharts'/);
  });

  it('/rapporter peker fortsatt på Analyse-flaten', () => {
    expect(les('../app/(app)/rapporter/page.tsx')).toMatch(/from '\.\.\/analyse\/page'/);
  });
});
