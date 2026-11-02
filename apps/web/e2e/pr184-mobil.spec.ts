import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const SIDER = [
  'hjem',
  'innboks',
  'samtale',
  'kunder',
  'kunde',
  'timeplan',
  'ny-jobb',
  'lager',
  'butikk',
  'organisasjon',
] as const;

const ARTIFACT = '/opt/cursor/artifacts/screenshots';

test.describe('PR #184 mobil 390px', () => {
  test.beforeAll(() => {
    mkdirSync(ARTIFACT, { recursive: true });
  });

  test('rendrer alle mobilflater og tar skjermbilder', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/visuell/mobil', { waitUntil: 'networkidle' });
    await expect(page.locator('[data-visuell-mobil]')).toBeVisible();

    await page.screenshot({
      path: `${ARTIFACT}/pr184-mobil-alle.png`,
      fullPage: true,
    });

    for (const id of SIDER) {
      const flate = page.locator(`[data-mobil-side="${id}"]`);
      await expect(flate).toBeVisible();
      await flate.screenshot({ path: `${ARTIFACT}/pr184-mobil-${id}.png` });
    }
  });

  test('preview-ruter uten innlogging', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const rute of ['/pulse-preview', '/innboks-preview', '/visual-forms-preview'] as const) {
      await page.goto(rute, { waitUntil: 'domcontentloaded' });
      const navn = rute.replace(/^\//, '');
      await page.screenshot({
        path: `${ARTIFACT}/pr184-${navn}.png`,
        fullPage: true,
      });
    }
  });
});
