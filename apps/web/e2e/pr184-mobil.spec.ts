import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const SIDER = [
  'hjem',
  'innboks',
  'samtale',
  'kunder',
  'kunde',
  'timeplan',
  'timeplan-ansatte',
  'ny-jobb',
  'lager',
  'butikk',
  'organisasjon',
  'skuff',
  'dato',
] as const;

const ARTIFACT = '/opt/cursor/artifacts/screenshots';

test.describe('PR #184 mobil 390px runde 2', () => {
  test.beforeAll(() => {
    mkdirSync(ARTIFACT, { recursive: true });
  });

  test('rendrer alle mobilflater og tar skjermbilder', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/visuell/mobil', { waitUntil: 'networkidle' });
    await expect(page.locator('[data-visuell-mobil]')).toBeVisible();

    await page.screenshot({
      path: `${ARTIFACT}/pr184-r2-mobil-alle.png`,
      fullPage: true,
    });

    for (const id of SIDER) {
      const flate = page.locator(`[data-mobil-side="${id}"]`);
      await expect(flate).toBeVisible();
      await flate.screenshot({ path: `${ARTIFACT}/pr184-r2-mobil-${id}.png` });
    }
  });

  test('åpen create-drawer og date picker', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/visuell/mobil', { waitUntil: 'networkidle' });

    const skuff = page.locator('[data-mobil-side="skuff"]');
    await skuff.scrollIntoViewIfNeeded();
    await skuff.getByRole('button', { name: 'Ny kunde' }).click();
    const kundeDialog = page.getByRole('dialog', { name: /Ny kunde/i });
    await expect(kundeDialog).toBeVisible();
    await kundeDialog.evaluate((el) => el.scrollIntoView({ block: 'end' }));
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `${ARTIFACT}/pr184-r2-drawer-apen.png`,
      fullPage: false,
    });
    await kundeDialog.screenshot({ path: `${ARTIFACT}/pr184-r2-drawer-dialog.png` });

    await page.keyboard.press('Escape');
    await expect(kundeDialog).toHaveCount(0);
    await page.locator('[data-mobil-side="dato"]').scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Dato' }).click();
    const datoDialog = page.getByRole('dialog', { name: /Dato/i });
    await expect(datoDialog).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `${ARTIFACT}/pr184-r2-datepicker.png`,
      fullPage: false,
    });
    await datoDialog.screenshot({ path: `${ARTIFACT}/pr184-r2-datepicker-dialog.png` });
  });
});
