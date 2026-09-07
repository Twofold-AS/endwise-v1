import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));
const ikoner = join(her, '..', 'src', 'assets', 'icons');
const barrel = readFileSync(join(her, '..', 'src', 'icons.ts'), 'utf8');
const generert = readFileSync(join(her, '..', 'src', 'icons.generated.ts'), 'utf8');

const DISARTO_CHROME = [
  'layout-dashboard',
  'calendar-days',
  'settings',
  'building-2',
  'map-pin',
  'log-out',
  'x',
  'trash-2',
  'activity',
  'inbox',
  'users',
  'package',
  'car',
  'wrench',
  'store',
] as const;

const EIER_BEHOLDT = ['handshake', 'clock-arrow-up'] as const;
const LUCIDE_BEHOLDT = ['HardHat', 'Bike', 'Sailboat'] as const;

describe('Disarto Regular — kuratert chrome (F5-20)', () => {
  it('chrome/nav/hjem-SVG-er er Disarto Regular med currentColor', () => {
    for (const slug of DISARTO_CHROME) {
      const svg = readFileSync(join(ikoner, `${slug}.svg`), 'utf8');
      expect(svg, slug).toMatch(/Disarto Regular/);
      expect(svg, slug).toMatch(/fill="currentColor"/);
      expect(svg, slug).not.toMatch(/fill="#[0-9a-fA-F]/);
    }
  });

  it('beholder eier-SVG for handshake og clock-arrow-up', () => {
    for (const slug of EIER_BEHOLDT) {
      const svg = readFileSync(join(ikoner, `${slug}.svg`), 'utf8');
      expect(svg, slug).not.toMatch(/Disarto Regular/);
      expect(generert).toMatch(
        `export const ${slug === 'handshake' ? 'Handshake' : 'ClockArrowUp'}`,
      );
    }
  });

  it('hard-hat, bike og sailboat kommer fortsatt fra lucide — ingen oppdiktet Disarto', () => {
    const filer = readdirSync(ikoner);
    expect(filer).not.toContain('hard-hat.svg');
    expect(filer).not.toContain('bike.svg');
    expect(filer).not.toContain('sailboat.svg');
    for (const navn of LUCIDE_BEHOLDT) {
      expect(barrel).toMatch(new RegExp(`\\b${navn}\\b`));
      expect(generert).not.toMatch(`export const ${navn}`);
    }
  });

  it('lucide-blokka har sluppet erstattede chrome-ikoner', () => {
    const lucideBlokk = barrel.slice(0, barrel.indexOf("from 'lucide-react'"));
    for (const navn of [
      'Building2',
      'MapPin',
      'Store',
      'Package',
      'ShoppingCart',
      'LifeBuoy',
      'ChartColumn',
      'Flag',
      'CalendarCheck',
    ]) {
      expect(lucideBlokk).not.toMatch(new RegExp(`\\b${navn}\\b`));
      expect(generert).toMatch(`export const ${navn}`);
    }
  });

  it('ingen andre ikon-API — barrel importerer ikke disarto-icons-react', () => {
    expect(barrel).not.toMatch(/from ['"]disarto-icons-react['"]/);
    expect(generert).not.toMatch(/from ['"]disarto-icons-react['"]/);
    expect(generert).toMatch(/from 'lucide-react'/);
  });
});
