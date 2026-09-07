import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const rot = dirname(fileURLToPath(import.meta.url));
const les = (rel: string) => readFileSync(join(rot, rel), 'utf8');

describe('Amicro dither charts på Rapporter', () => {
  it('Analyse bruker Amicro-canvas, ikke Recharts ChartContainer', () => {
    const analyse = les('../app/(app)/analyse/page.tsx');
    expect(analyse).toMatch(/DitherStackedChart/);
    expect(analyse).toMatch(/DitherGrowthChart/);
    expect(analyse).toMatch(/RevenueLineChart/);
    expect(analyse).toMatch(/DitherDonutChart/);
    expect(analyse).toMatch(/#a43a0a/);
    expect(analyse).toMatch(/#141413/);
    expect(analyse).not.toMatch(/ChartContainer/);
    expect(analyse).not.toMatch(/from 'recharts'/);
  });

  it('/rapporter peker fortsatt på Analyse-flaten', () => {
    expect(les('../app/(app)/rapporter/page.tsx')).toMatch(/from '\.\.\/analyse\/page'/);
  });
});
